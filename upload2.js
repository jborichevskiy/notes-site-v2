const fs = require("fs");
const path = require("path");

const directoryPath = __dirname;
const url = "https://jonbo-notessiteingest.web.val.run";

async function main() {
  try {
    const fetch = (await import("node-fetch")).default;

    const files = fs.readdirSync(directoryPath);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    const data = htmlFiles
      .map((file) => {
        const idMatch = file.match(/\[p(\d+)\]/);
        if (idMatch) {
          const id = idMatch[1];
          const content = fs
            .readFileSync(path.join(directoryPath, file), "utf-8")
            .replace(/�/g, "'");
          return {
            id,
            content: Buffer.from(content, "utf-8").toString("base64"),
          };
        }
      })
      .filter(Boolean);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    console.log(responseData);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
