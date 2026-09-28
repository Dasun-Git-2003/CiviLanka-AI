import os, json
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.retriever import get_api_key
from agent.prompts import HAZARD_CLASSIFIER_PROMPT

api_key = get_api_key()
llm = ChatGoogleGenerativeAI(model="gemini-3.8-flash", api_key=api_key)

prompt = HAZARD_CLASSIFIER_PROMPT.format(
    title="Burst water pipe outside school",
    description="High-pressure underground water main burst flooding sidewalk and road outside Visakha Vidyalaya school gates during morning arrival hours.",
    category_supplied="Other",
    location="Vajira Road, Colombo 04 (Near School Zone)",
    metadata="Morning school arrival, children present",
    image_url="None",
    docs="CMC SLA: Water main bursts near school zones must be prioritized as HIGH or CRITICAL."
) + "\n\nProvide your response as strictly valid JSON matching this schema:\n{\n  \"primary_category\": \"Water Main Burst & Distribution Failure\",\n  \"department\": \"NWSDB\",\n  \"assigned_severity\": \"HIGH\",\n  \"urgency_score\": 90.0,\n  \"sla_resolution_hours\": 4,\n  \"safety_risk_summary\": \"...\",\n  \"immediate_actions\": [\"...\"],\n  \"crew_sizing\": \"...\",\n  \"requires_police_traffic_support\": true,\n  \"monsoon_flood_risk\": false,\n  \"environmental_factors\": [\"School Zone\"],\n  \"confidence_score\": 0.96\n}"

res = llm.invoke(prompt)
raw_text = res.content[0]["text"] if isinstance(res.content, list) and "text" in res.content[0] else str(res.content)
clean_text = raw_text.strip()
if clean_text.startswith("```json"):
    clean_text = clean_text[7:]
if clean_text.startswith("```"):
    clean_text = clean_text[3:]
if clean_text.endswith("```"):
    clean_text = clean_text[:-3]

parsed = json.loads(clean_text.strip())
print("PARSED JSON SUCCESSFULLY:")
print(json.dumps(parsed, indent=2))
