import { allowRequest, DESIGNER_INSTRUCTIONS, DESIGN_SCHEMA, getOpenAI, sendApiError, setCommonHeaders, validateDesign, validatePhotoDataUrl } from "../../lib/ai.js";

const MAX_BODY_BYTES = 4_000_000;
const MAX_MESSAGES = 12;

function validBrief(brief) {
  if (!brief || typeof brief !== "object") return false;
  return typeof brief.room === "string" && brief.room.length <= 80
    && typeof brief.style === "string" && brief.style.length <= 80
    && typeof brief.budget === "string" && brief.budget.length <= 80
    && Number.isFinite(Number(brief.width)) && Number(brief.width) > 0 && Number(brief.width) <= 100
    && Number.isFinite(Number(brief.length)) && Number(brief.length) > 0 && Number(brief.length) <= 100;
}

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for design conversations." });
  }
  if (Number(req.headers["content-length"] || 0) > MAX_BODY_BYTES) return res.status(413).json({ error: "That request is too large. Choose a smaller photo (maximum 2.5 MB)." });
  try {
    const body = req.body || {};
    const messageInput = Array.isArray(body.messages) ? body.messages : [];
    if (!validBrief(body.brief)) return res.status(400).json({ error: "Add a valid room type, style, budget, and dimensions first." });
    if (!messageInput.length || messageInput.length > MAX_MESSAGES) return res.status(400).json({ error: "Send a message with up to 12 recent turns." });
    const messages = messageInput.map((item) => {
      if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 2_000) throw new Error("Messages must be plain text under 2,000 characters.");
      return { role: item.role, content: item.content.trim() };
    });
    if (messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "The last conversation turn must be from you." });
    const photo = validatePhotoDataUrl(body.photo);
    if (!allowRequest(req, res, 20)) return;
    const briefContext = [
      "ROOM BRIEF (user-provided; dimensions are user-entered, not photo-derived):",
      `Project: ${String(body.brief.name || "Room concept").slice(0, 100)}`,
      `Room: ${body.brief.room}`,
      `Room width x length: ${Number(body.brief.width)} x ${Number(body.brief.length)} metres`,
      `Budget band: ${body.brief.budget}`,
      `Selected style: ${body.brief.style}`,
      `Must-keep items: ${String(body.brief.keep || "Not specified").slice(0, 500)}`,
      `Preferred colors: ${String(body.brief.colorOne || "not specified")} and ${String(body.brief.colorTwo || "not specified")}`,
      photo ? "A room photo is attached to this request for visual analysis only. Do not infer exact measurements from it." : "No room photo is attached."
    ].join("\n");
    const input = messages.slice(0, -1).map((item) => ({ role: item.role, content: item.content }));
    const lastContent = [{ type: "input_text", text: `${briefContext}\n\nUser request: ${messages[messages.length - 1].content}` }];
    if (photo) lastContent.push({ type: "input_image", image_url: photo.dataUrl, detail: "high" });
    input.push({ role: "user", content: lastContent });
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL,
      instructions: DESIGNER_INSTRUCTIONS,
      input,
      text: { format: { type: "json_schema", name: "looma_interior_design", strict: true, schema: DESIGN_SCHEMA } },
      max_output_tokens: 1_400,
      store: false
    });
    let result;
    try { result = JSON.parse(response.output_text || ""); } catch { return res.status(502).json({ error: "Looma received an unreadable design response. Please retry." }); }
    if (!validateDesign(result)) return res.status(502).json({ error: "Looma received an incomplete design response. Please retry." });
    return res.status(200).json({ message: result.message, design: result.design });
  } catch (error) {
    if (/photo|image format|messages|selected file/i.test(error?.message || "")) return res.status(400).json({ error: error.message });
    return sendApiError(res, error);
  }
}
