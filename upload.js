const fs = require("fs");
const path = require("path");

const directoryPath = __dirname;
const url = "https://jonbo-notessiteingest.web.val.run";

const axios = require("axios");
const FormData = require("form-data");

async function uploadBase64ToIPFS(base64Image) {
  const buffer = Buffer.from(base64Image, "base64");
  const formData = new FormData();
  formData.append("file", buffer, {
    filename: "file.png",
    contentType: "image/png",
  });

  const pinataMetadata = JSON.stringify({
    name: "notes.site",
  });
  formData.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", pinataOptions);

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
          Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxZjA5ZmY1YS0wYjk3LTQ5OWUtOTVkOC05ZTU5MDI5MjE5YjgiLCJlbWFpbCI6ImpvbmJvQGhleS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNTgxMjRlNDk5ZmRiZjkyOTA5YmUiLCJzY29wZWRLZXlTZWNyZXQiOiI5ZjQzYzc1OWYxYTE4OWYxYjNiY2VhOTRjMGY3MGU4MTk0ZGMzMmJkOWYzN2NmODQ4MjdmM2I2ZDNmMjQ0MzhjIiwiaWF0IjoxNjk1MDE0ODgzfQ.qofnzkO30w3PkG0FVZl4dtQGmzY-L7Do9_KozY62W1w"}`,
        },
      }
    );
    // console.log({ res });
    console.log("-> ", res.data.IpfsHash);
    return res.data.IpfsHash;
  } catch (error) {
    console.error(error);
  }
}

// function convertHEICToPNG()

const processMedia = async (content) => {
  const imgTags =
    content.match(/<img[^>]*src="data:image\/(?:jpeg|heic);base64,([^"]*)"/g) ||
    [];
  console.log("imgTags.length", imgTags.length);
  // TODO: convert heic to png
  const base64Data = imgTags.map(
    (tag) => tag.match(/data:image\/(?:jpeg|heic);base64,([^"]*)/)[1]
  );
  const responses = await Promise.all(
    // base64Data.map((data, index) => imgTags[index].includes('image/heic') ? convertHEICToPNG(data) : data)
    base64Data.map((data) => uploadBase64ToIPFS(data))
  );
  console.log({ responses });

  responses.forEach((response, index) => {
    content = content.replace(
      imgTags[index],
      `<img style="max-width: 100%; max-height: 100%;" src="https://ipfs.io/ipfs/${response}"`
    );
  });

  return content;
};

async function main() {
  try {
    const fetch = (await import("node-fetch")).default;

    const files = fs.readdirSync(directoryPath);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));

    for (const file of htmlFiles) {
      const idMatch = file.match(/\[p(\d+)\]/);
      if (idMatch) {
        const id = idMatch[1];
        console.log({ id });
        const content = fs
          .readFileSync(path.join(directoryPath, file), "utf-8")
          .replace(/�/g, "'");

        // process the file

        const mediaProcessed = await processMedia(content);

        const data = {
          id,
          content: Buffer.from(mediaProcessed, "utf-8").toString("base64"),
        };
        // console.log({ data });

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log(responseData);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
