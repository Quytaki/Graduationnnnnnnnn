"""
AI Screening Service for CV analysis.
Uses Google Gemini API to analyze CVs against job requirements and custom criteria.
Configure via environment variables:
  - GEMINI_API_KEY: Your Google Gemini API key (free at https://aistudio.google.com/apikey)
  - GEMINI_MODEL: Model to use (default: gemini-2.5-pro)
"""
import os
import json
import re

# ── CV Text Extraction ────────────────────────────────────

def extract_text_from_file(file_path: str) -> str:
    """Extract text from CV file (PDF, DOCX, or plain text)."""
    if not file_path or not os.path.exists(file_path):
        return ""

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext in (".docx", ".doc"):
        return _extract_docx(file_path)
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    else:
        # Try reading as text
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return ""


def _extract_pdf(file_path: str) -> str:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        return "\n".join(text_parts)
    except ImportError:
        return "[PDF extraction not available - install PyPDF2]"
    except Exception as e:
        return f"[Error extracting PDF: {str(e)}]"


def _extract_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    except ImportError:
        return "[DOCX extraction not available - install python-docx]"
    except Exception as e:
        return f"[Error extracting DOCX: {str(e)}]"


# ── AI Screening ─────────────────────────────────────────

def build_screening_prompt(cv_text: str, job_description: str, requirements: str, criteria: list) -> str:
    """Build the prompt for AI screening."""
    criteria_text = ""
    if criteria:
        criteria_text = "\n## EVALUATION CRITERIA (with weights):\n"
        for c in criteria:
            must_have = " [MUST-HAVE]" if c.get("must_have") else ""
            criteria_text += f"- {c['name']} (weight: {c.get('weight', 0)}%){must_have}: {c.get('description', '')}\n"

    prompt = f"""You are an expert AI recruiter. Analyze the following CV against the job requirements and provide a detailed screening assessment.

## JOB DESCRIPTION:
{job_description or 'Not provided'}

## JOB REQUIREMENTS:
{requirements or 'Not provided'}

{criteria_text}

## CANDIDATE CV:
{cv_text[:8000]}

## INSTRUCTIONS:
Evaluate the candidate and return a JSON response with this EXACT structure:
{{
    "score": <number 0-100>,
    "criteria_breakdown": [
        {{
            "name": "<criterion name>",
            "score": <number 0-100>,
            "weight": <number>,
            "weighted_score": <number>,
            "notes": "<brief explanation>"
        }}
    ],
    "must_have_check": {{
        "passed": <true/false>,
        "items": [
            {{
                "name": "<must-have item>",
                "met": <true/false>,
                "evidence": "<brief evidence from CV>"
            }}
        ]
    }},
    "summary": "<2-3 sentence summary of candidate fit>",
    "recommendation": "<Strong Fit | Potential | Not Fit>"
}}

IMPORTANT:
- Score must be 0-100 based on weighted criteria
- If criteria are provided, evaluate EACH criterion
- If must-have items exist, check EACH one
- Be objective and evidence-based
- Return ONLY valid JSON, no markdown formatting
"""
    return prompt


def _extract_json_from_response(text: str) -> dict:
    """Robustly extract JSON from AI response that may contain markdown or extra text."""
    text = text.strip()

    # Attempt 1: Direct parse (cleanest case)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Remove markdown code fences (```json ... ``` or ``` ... ```)
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', text, re.DOTALL)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Attempt 3: Find the first complete JSON object by matching braces
    brace_start = text.find('{')
    if brace_start != -1:
        depth = 0
        for i in range(brace_start, len(text)):
            if text[i] == '{':
                depth += 1
            elif text[i] == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[brace_start:i + 1])
                    except json.JSONDecodeError:
                        break

    # Attempt 4: Aggressive cleanup — remove common AI prefixes/suffixes
    cleaned = re.sub(r'^[^{]*', '', text, count=1)  # Remove everything before first {
    cleaned = re.sub(r'[^}]*$', '', cleaned, count=1)  # Remove everything after last }
    if cleaned:
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Could not extract JSON from AI response", text, 0)


def run_ai_screening(cv_text: str, job_description: str, requirements: str, criteria: list) -> dict:
    """
    Run AI screening on a CV.
    Returns the screening result as a dict.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key or api_key == "your-gemini-api-key-here":
        # Return a simulated result when no API key is configured
        return _simulate_screening(cv_text, criteria)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction="You are an expert HR AI assistant. You MUST respond with valid JSON only. No explanations, no markdown, no extra text — just pure JSON.",
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=4000,
                response_mime_type="application/json",
            ),
        )

        prompt = build_screening_prompt(cv_text, job_description, requirements, criteria)
        response = model.generate_content(prompt)

        result_text = response.text.strip()
        result = _extract_json_from_response(result_text)

        # Validate required fields & set defaults
        result.setdefault("score", 0)
        result.setdefault("criteria_breakdown", [])
        result.setdefault("must_have_check", {"passed": False, "items": []})
        result.setdefault("summary", "")
        result.setdefault("recommendation", "Not Fit")

        # Normalize recommendation value
        rec = str(result["recommendation"]).lower().replace("_", " ")
        if "strong" in rec:
            result["recommendation"] = "Strong Fit"
        elif "potential" in rec or "maybe" in rec:
            result["recommendation"] = "Potential"
        else:
            result["recommendation"] = "Not Fit"

        # Ensure score is numeric
        try:
            result["score"] = float(result["score"])
        except (ValueError, TypeError):
            result["score"] = 0

        return result

    except ImportError:
        return _simulate_screening(cv_text, criteria)
    except json.JSONDecodeError as e:
        print(f"[AI Screening] JSON parse error: {e}")
        print(f"[AI Screening] Raw response: {result_text[:500] if 'result_text' in dir() else 'N/A'}")
        return {
            "score": 0,
            "criteria_breakdown": [],
            "must_have_check": {"passed": False, "items": []},
            "summary": f"Loi phan tich phan hoi AI. Vui long thu lai.",
            "recommendation": "Not Fit"
        }
    except Exception as e:
        print(f"[AI Screening] Error: {type(e).__name__}: {e}")
        return {
            "score": 0,
            "criteria_breakdown": [],
            "must_have_check": {"passed": False, "items": []},
            "summary": f"Loi AI screening: {str(e)}",
            "recommendation": "Not Fit"
        }


def _simulate_screening(cv_text: str, criteria: list) -> dict:
    """
    Simulate AI screening when no API key is configured.
    Provides a basic keyword-based analysis.
    """
    import random

    cv_lower = cv_text.lower() if cv_text else ""
    breakdown = []
    total_weight = 0
    weighted_sum = 0

    if criteria:
        for c in criteria:
            weight = c.get("weight", 0)
            name_lower = c.get("name", "").lower()
            desc_lower = c.get("description", "").lower()

            # Simple keyword matching
            keywords = name_lower.split() + desc_lower.split()
            keywords = [k for k in keywords if len(k) > 3]
            matches = sum(1 for k in keywords if k in cv_lower)
            match_ratio = min(matches / max(len(keywords), 1), 1.0)

            score = int(40 + match_ratio * 50 + random.randint(0, 10))
            score = min(score, 100)
            weighted_score = round(score * weight / 100, 1)

            breakdown.append({
                "name": c["name"],
                "score": score,
                "weight": weight,
                "weighted_score": weighted_score,
                "notes": f"Keyword match: {matches}/{len(keywords)} relevant terms found"
            })
            total_weight += weight
            weighted_sum += weighted_score
    else:
        # Default criteria
        default_criteria = [
            ("Technical Skills", 40),
            ("Experience", 30),
            ("Education", 20),
            ("Communication", 10),
        ]
        for name, weight in default_criteria:
            score = random.randint(45, 85)
            weighted_score = round(score * weight / 100, 1)
            breakdown.append({
                "name": name,
                "score": score,
                "weight": weight,
                "weighted_score": weighted_score,
                "notes": "Automated basic analysis (no AI API key configured)"
            })
            total_weight += weight
            weighted_sum += weighted_score

    final_score = round(weighted_sum) if total_weight > 0 else random.randint(45, 75)

    # Must-have check
    must_have_items = [c for c in (criteria or []) if c.get("must_have")]
    must_have_results = []
    all_passed = True
    for item in must_have_items:
        keywords = item.get("name", "").lower().split()
        met = any(k in cv_lower for k in keywords if len(k) > 3) if cv_lower else False
        if not met:
            all_passed = False
        must_have_results.append({
            "name": item["name"],
            "met": met,
            "evidence": "Keyword-based check (configure Gemini API key for accurate analysis)"
        })

    if final_score >= 80:
        recommendation = "Strong Fit"
    elif final_score >= 50:
        recommendation = "Potential"
    else:
        recommendation = "Not Fit"

    return {
        "score": final_score,
        "criteria_breakdown": breakdown,
        "must_have_check": {
            "passed": all_passed if must_have_items else True,
            "items": must_have_results
        },
        "summary": f"Automated screening (score: {final_score}/100). Configure GEMINI_API_KEY for detailed AI analysis.",
        "recommendation": recommendation
    }
