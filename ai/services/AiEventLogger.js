import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

class AiEventLogger {
  constructor(outputDir = "./output") {
    this.outputDir = outputDir;
    this.filePath = path.join(this.outputDir, "aiEvents.json");
  }

  async logEvent({ kind, input, output, model, latencyMs, userId = null }) {
    const inputHash = crypto.createHash("sha256").update(input).digest("hex");

    const event = {
      kind,
      inputHash,
      input,
      output,
      model,
      latencyMs,
      createdAt: new Date(),
      userId,
    };

    // ensure directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    let existing = [];
    try {
      const fileContent = await fs.readFile(this.filePath, "utf-8");
      existing = JSON.parse(fileContent);
    } catch (_) {
      existing = [];
    }

    existing.push(event);
    await fs.writeFile(this.filePath, JSON.stringify(existing, null, 2), "utf-8");
  }
}

export default AiEventLogger;