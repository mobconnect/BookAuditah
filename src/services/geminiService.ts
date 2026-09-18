export async function proofreadContent(content: string) {
  try {
    const response = await fetch("/api/gemini/proofread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return await response.json();
  } catch (error) {
    console.error("AI Proofreading failed:", error);
    return { suggestions: [] };
  }
}

export async function analyzeStoryline(storyline: string, content: string) {
  try {
    const response = await fetch("/api/gemini/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyline, content }),
    });
    return await response.json();
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return { isConsistent: true, feedback: "Unable to analyze at this time." };
  }
}

export async function translateManuscript(content: string, targetLanguage: string) {
  try {
    const response = await fetch("/api/gemini/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, targetLanguage }),
    });
    return await response.json();
  } catch (error) {
    console.error("AI Translation failed:", error);
    return { error: "Translation failed" };
  }
}
