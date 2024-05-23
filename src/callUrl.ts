import axios from "axios";

export async function callUrl() {
  try {
    const bitvocationResponse = await axios.get(
      "https://bitvocation-bot-2-2.onrender.com/health"
    );
    console.log(
      "URL called successfully bitvocation_bot:",
      bitvocationResponse
    );
    const bitvocationJobs = await axios.get(
      "https://content-scraper.onrender.com"
    );
    console.log("URL called bitcoin Jobs Scraper:", bitvocationJobs);
  } catch (error) {
    console.error("Error calling URL:", error);
  }
}
