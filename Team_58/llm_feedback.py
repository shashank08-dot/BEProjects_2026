import ollama

def generate_feedback(final_score, label, traits):
    prompt = f"""
    You are an AI interview performance coach.
    Provide short, constructive, and motivating feedback based on these metrics:

    Final Average Score: {final_score}
    Overall Label: {label}

    Trait Averages:
    Openness: {traits.get('openness_level')}
    Conscientiousness: {traits.get('conscientiousness_level')}
    Extraversion: {traits.get('extraversion_level')}
    Agreeableness: {traits.get('agreeableness_level')}
    Neuroticism: {traits.get('neuroticism_level')}

    Explain what these results mean about the candidate's confidence, communication,
    and personality, and give 2-3 improvement tips. End with an encouraging closing line.
    """

    try:
        response = ollama.chat(
            model="gemma:2b",  # ✅ Lightweight model for CPU-only systems
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]
    except Exception as e:
        return f"⚠️ LLM feedback error: {e}"