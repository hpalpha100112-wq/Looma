import { toFile } from "openai/uploads";
import { allowRequest, getOpenAI, sendApiError, setCommonHeaders, validatePhotoDataUrl } from "../../lib/ai.js";

export default async function handler(req, res) {
  setCommonHeaders(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to generate a concept image." });
  }
  if (Number(req.headers["content-length"] || 0) > 4_000_000) return res.status(413).json({ error: "That request is too large. Choose a smaller photo (maximum 2.5 MB)." });
  try {
    const body = req.body || {};
    if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 2_000) return res.status(400).json({ error: "Describe the interior concept in 2,000 characters or fewer." });
    const photo = validatePhotoDataUrl(body.photo);
    if (!allowRequest(req, res, 4)) return;
    const missingImageConfig = ["OPENAI_API_KEY", "OPENAI_IMAGE_MODEL"].filter((name) => !process.env[name]);
    if (missingImageConfig.length) {
      const error = new Error("Image generation is not configured yet. Add " + missingImageConfig.join(" and ") + " in Vercel Environment Variables.");
      error.code = "AI_NOT_CONFIGURED";
      throw error;
    }
    const prompt = [
      "Create a photorealistic interior design concept image.",
      "Respect the reference room's visible architecture and camera perspective when a reference is supplied.",
      "Do not claim or imply exact room dimensions or create labels, text, floor plans, or measured 3D geometry.",
      "Use this design direction:",
      body.prompt.trim(),
      "This image is an artistic visualization only; it is not a construction drawing or accurate 3D model."
    ].join("\n");
    const client = getOpenAI();
    const image = photo
      ? await client.images.edit({
          model: process.env.OPENAI_IMAGE_MODEL,
          image: await toFile(photo.bytes, "room-reference." + (photo.mimeType === "image/jpeg" ? "jpg" : photo.mimeType.split("/")[1]), { type: photo.mimeType }),
          prompt,
          size: "1024x1024",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 80,
          n: 1
        })
      : await client.images.generate({
          model: process.env.OPENAI_IMAGE_MODEL,
          prompt,
          size: "1024x1024",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 80,
          n: 1
        });
    const output = image.data?.[0]?.b64_json;
    if (!output) return res.status(502).json({ error: "The image provider returned no image. Please retry." });
    return res.status(200).json({ image: "data:image/jpeg;base64," + output, note: "AI concept image only. It is not measured room geometry." });
  } catch (error) {
    if (/photo|image format|selected file/i.test(error?.message || "")) return res.status(400).json({ error: error.message });
    return sendApiError(res, error);
  }
}
