"use client";

export async function convertImageToData(formData: FormData) {
  try {
    const file = formData.get("billImage") as File;
    if (!file) throw new Error("No file uploaded");

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key එක සොයාගත නොහැක. .env ෆයිල් එක පරීක්ෂා කරන්න.");

    // ඔයාගේ ලිස්ට් එකෙන් අපි හොයාගත්ත නිවැරදිම Endpoint එක
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

   // 🚀 මෙන්න සුපිරියටම හදපු අලුත් Prompt එක
    const prompt = "Extract all tabular data from this receipt image. Return the data strictly as a clean JSON array of objects. Each object MUST contain these exact keys: 'item_name' (The exact name of the item as shown in the receipt. If it is in Sinhalese, extract it in Sinhalese itself), 'quantity' (Number of items bought as an integer), 'price' (The unit price of that specific item as a number), 'item_size' (Look closely at the item name or description for sizes like '1L', '500g', 'Pack', 'Bottle', 'KG'. If no specific size is found, try to describe the item type, otherwise use 'Standard'). Do not include any markdown backticks or extra text.";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Google API Error");
    }

    const resData = await response.json();
    let textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    if (textResponse.includes("```")) {
      textResponse = textResponse.replace(/```json|```/g, "").trim();
    }

    const jsonData = JSON.parse(textResponse.trim());
    return { success: true, data: jsonData };

  } catch (error: any) {
    console.error("Gemini Fetch Error:", error);
    return { success: false, error: error.message || "Can't process the Sheet!" };
  }
}