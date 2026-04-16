const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { SearchClient, AzureKeyCredential } = require("@azure/search-documents");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const searchClient = new SearchClient(
  process.env.AZURE_SEARCH_ENDPOINT,
  process.env.AZURE_SEARCH_INDEX,
  new AzureKeyCredential(process.env.AZURE_SEARCH_KEY)
);

const openaiClient = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": "2024-02-15-preview" }
});

// ─────────────────────────────────────────────
// PROFESSIONAL SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are a Senior Food Export Compliance Auditor with 20+ years of experience in international food regulatory affairs. You work for a globally recognized certification body and are responsible for producing official compliance assessments used by food manufacturers, exporters, and regulatory authorities.

Your expertise covers:
- EU Regulations: 1169/2011 (Food Information to Consumers), 853/2004 (Hygiene for animal products), 2073/2005 (Microbiological criteria), 2023/915 (Contaminants), 2018/775 (Country of origin labeling)
- US FDA 21 CFR Part 101 (Food Labeling), USDA FSIS regulations, FSMA requirements
- UK Food Information Regulations 2014, UK FSA post-Brexit standards
- Codex Alimentarius international food standards
- Country-specific import requirements and technical barriers to trade

YOUR TASK:
Analyze the provided food packaging images (front and back label) along with any compliance documents retrieved from the regulatory knowledge base. Produce a detailed, professional compliance assessment report.

ANALYSIS METHODOLOGY:
1. Carefully examine BOTH the front and back label images
2. Cross-reference all visible label information against the compliance rules provided
3. Apply the relevant regulatory framework for the target country
4. Identify specific compliance gaps, risks, and commendations
5. Use precise regulatory language and cite specific regulation articles where applicable

STRICT OUTPUT RULES:
- Return ONLY valid JSON — no markdown fences, no explanations outside the JSON structure
- Every field must be filled — use "Not Visible on Label" if information is not present in the image
- Do NOT use vague statements like "may need review" — be specific and decisive
- All compliance fields must cite the specific regulation article number (e.g., "Article 9(1)(a) of EU Reg. 1169/2011")
- Use professional regulatory language throughout

REQUIRED OUTPUT STRUCTURE (return exactly this JSON, no deviations):
{
  "verdict": "Compliant" or "Not Compliant",

  "summary": {
    "document_analysis": {
      "title": "Full official title of the compliance document or test report found in the knowledge base",
      "issuer": "Name of the issuing authority or laboratory",
      "date": "Date of the compliance document or report",
      "compliance": "Write 4-6 detailed professional sentences assessing the overall regulatory compliance status. Cite specific EU/country regulations (e.g. EU Reg. 2073/2005 Art. 3, EU Reg. 2023/915). Mention chemical safety (heavy metals, PAH4), microbiological safety (Listeria, Salmonella, E.coli), and sensory findings. State whether the product meets or fails each applicable standard and why.",
      "market_status": "Write 2-3 authoritative sentences. State clearly whether the product is legally marketable in the target country. Reference the specific legal basis (e.g. LMSVG BGBl. I 13/2006 for Austria, EU Reg. 1169/2011 for EU). If conditional, state exactly what must be corrected before market entry.",
      "labeling": "Write 4-5 detailed sentences analyzing the label for full compliance. Check: (1) product name and species name with scientific name, (2) mandatory allergen declaration and emphasis formatting, (3) nutritional declaration format per 100g and per portion, (4) font size compliance (minimum x-height 1.2mm per EU 1169/2011 Annex IV), (5) country of origin per EU Reg. 2018/775, (6) storage conditions, (7) best-before date format, (8) manufacturer/importer details. Note any rounding deviations in nutritional values per December 2012 guidelines."
    },

    "product_analysis": {
      "product_name": "Full product name as visible on the label including species and cut",
      "origin": "Country of origin of the raw material as stated on the label",
      "manufacturer": "Full manufacturer or packer name and address as shown",
      "packaging_location": "Country or location where the product was packaged",
      "energy": "Energy value per 100g as shown on the nutritional table (e.g. 204 kcal / 851 kJ)",
      "protein": "Protein content per 100g as shown (e.g. 22.2g)",
      "salt": "Salt content per 100g as shown (e.g. 0.09g)",
      "storage": "Full storage instructions as printed on the label",
      "best_before": "Best before or use-by date and lot number as printed"
    }
  }
}

IMPORTANT REMINDERS:
- Be authoritative and decisive — this report will be used for actual export decisions
- Never state "Unable to determine" — analyze what IS visible and note what is NOT visible
- Compliance must reference specific regulation numbers, not general statements
- If the label is in a non-target-country language, always flag this as a critical compliance issue
- Microbiological and chemical test results from the knowledge base should be explicitly referenced in the compliance field
`;

app.post("/analyze", async (req, res) => {
  try {
    const { frontImage, backImage, country } = req.body;

    console.log("INPUT RECEIVED:", {
      country,
      frontImageLength: frontImage?.length,
      backImageLength: backImage?.length
    });

    // Step 1: Fetch compliance rules from Azure AI Search
    const searchResults = await searchClient.search(
      `${country} food labeling compliance requirements regulations`,
      { top: 3, select: ["content_text"] }
    );

    let context = "";
    for await (const result of searchResults.results) {
      context += result.document.content_text + "\n\n";
    }

    if (!context.trim()) {
      context = `No specific compliance documents found for ${country} in the knowledge base. Apply general international food labeling standards (Codex Alimentarius) and the most relevant regional framework.`;
    }

    console.log("SEARCH CONTEXT LENGTH:", context.length);

    // Step 2: Call GPT-4o Vision
    const response = await openaiClient.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `TARGET EXPORT COUNTRY: ${country}

COMPLIANCE KNOWLEDGE BASE (retrieved from official documents):
${context}

Please analyze the food packaging images below (front label image first, back label image second) and produce a full compliance report in the exact JSON structure specified. Be thorough, professional, and cite specific regulatory articles.`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${frontImage}` }
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${backImage}` }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    let output = response.choices[0].message.content;
    console.log("RAW GPT OUTPUT:", output);

    output = output.replace(/```json|```/g, "").trim();
    const jsonMatch = output.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      console.error("JSON PARSE FAILED:", output);
      return res.status(500).json({ error: "Invalid JSON response from AI model" });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build compliance report
    const report = {
      summary: `Product "${parsed.summary.product_analysis.product_name}" assessed for export to ${country}.\n\nFinal Verdict: ${parsed.verdict}.\n\nDocument source: ${parsed.summary.document_analysis.title || "Regulatory knowledge base"} (${parsed.summary.document_analysis.issuer || "N/A"}, ${parsed.summary.document_analysis.date || "N/A"}).`,

      observations: [
        parsed.summary.document_analysis.compliance,
        parsed.summary.document_analysis.labeling
      ],

      recommendation:
        parsed.verdict === "Compliant"
          ? "✅ This product satisfies the applicable regulatory requirements for the target market and may proceed to export subject to standard customs documentation."
          : "❌ This product does not currently meet all regulatory requirements for the target market. Corrective action must be taken on the identified non-conformities before export approval can be granted."
    };

    const finalResponse = { ...parsed, report };
    console.log("FINAL RESPONSE SENT:", JSON.stringify(finalResponse, null, 2));
    res.json(finalResponse);

  } catch (error) {
    console.error("SERVER ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));