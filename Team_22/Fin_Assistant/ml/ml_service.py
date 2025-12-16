
import os
from flask import Flask, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
import pandas as pd

PORT = int(os.environ.get('PORT', 5001))
FEEDBACK_PATH = os.environ.get('FEEDBACK_PATH', 'feedback.csv')

app = Flask(__name__)

# Enhanced training data for better classification
DATA = [
    # Food & Dining
    ('zomato order biryani', 'Food'),
    ('swiggy dinner pizza', 'Food'),
    ('restaurant payment', 'Food'),
    ('food delivery', 'Food'),
    ('cafe coffee day', 'Food'),
    ('mcdonalds burger', 'Food'),
    ('dominos pizza', 'Food'),
    ('kfc chicken', 'Food'),
    
    # Groceries
    ('bigbasket groceries order', 'Groceries'),
    ('supermarket vegetables', 'Groceries'),
    ('grocery shopping', 'Groceries'),
    ('fresh vegetables', 'Groceries'),
    ('milk purchase', 'Groceries'),
    ('bread eggs', 'Groceries'),
    
    # Transport
    ('uber trip to office', 'Transport'),
    ('ola ride airport', 'Transport'),
    ('metro card recharge', 'Transport'),
    ('bus ticket', 'Transport'),
    ('petrol fuel', 'Transport'),
    ('parking fee', 'Transport'),
    ('taxi ride', 'Transport'),
    
    # Bills & Utilities
    ('electricity bill payment', 'Bills'),
    ('jio recharge mobile', 'Bills'),
    ('water bill', 'Bills'),
    ('gas bill', 'Bills'),
    ('internet bill', 'Bills'),
    ('insurance premium', 'Bills'),
    ('credit card payment', 'Bills'),
    ('loan emi', 'Bills'),
    
    # Health
    ('pharmacy medicines', 'Health'),
    ('hospital consultation', 'Health'),
    ('doctor visit', 'Health'),
    ('medical test', 'Health'),
    ('medicine purchase', 'Health'),
    ('dental checkup', 'Health'),
    
    # Shopping
    ('amazon shopping electronics', 'Shopping'),
    ('myntra fashion order', 'Shopping'),
    ('flipkart mobile', 'Shopping'),
    ('clothes shopping', 'Shopping'),
    ('electronics purchase', 'Shopping'),
    ('online shopping', 'Shopping'),
    
    # Entertainment
    ('movie tickets bookmyshow', 'Entertainment'),
    ('netflix subscription', 'Entertainment'),
    ('spotify premium', 'Entertainment'),
    ('youtube premium', 'Entertainment'),
    ('gaming purchase', 'Entertainment'),
    ('concert tickets', 'Entertainment'),
    
    # Education
    ('udemy course fee', 'Education'),
    ('coursera subscription', 'Education'),
    ('book purchase', 'Education'),
    ('tuition fee', 'Education'),
    ('course enrollment', 'Education'),
    
    # Income
    ('salary credited', 'Income'),
    ('stipend received', 'Income'),
    ('bonus credited', 'Income'),
    ('freelance payment', 'Income'),
    ('investment return', 'Income'),
    ('refund received', 'Income'),
    
    # Banking
    ('atm withdrawal', 'Cash'),
    ('bank transfer', 'NetBanking'),
    ('upi payment', 'UPI'),
    ('card payment', 'Card'),
    ('wallet recharge', 'Wallet'),
]


df = pd.DataFrame(DATA, columns=['text','label'])
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.2, random_state=42)

pipe = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1,2), min_df=1)),
    ('clf', LogisticRegression(max_iter=1000))
])
pipe.fit(X_train, y_train)

@app.post('/predict')
def predict():
    data = request.get_json(force=True)
    text = data.get('text','')
    pred = pipe.predict([text])[0]
    proba = max(pipe.predict_proba([text])[0])
    # pass back merchant if they already parsed on Node
    return jsonify({
        'category': pred,
        'confidence': float(proba),
        'merchant': data.get('merchant','')
    })

@app.post('/feedback')
def feedback():
    data = request.get_json(force=True)
    text = data.get('text','')
    label = data.get('label','')
    amount = data.get('amount', None)
    merchant = data.get('merchant','')
    if not text or not label:
        return jsonify({'ok': False, 'error': 'text and label required'}), 400
    # Append to feedback store (CSV)
    try:
        exists = os.path.exists(FEEDBACK_PATH)
        df_new = pd.DataFrame([{'text': text, 'label': label, 'amount': amount, 'merchant': merchant}])
        if exists:
            df_old = pd.read_csv(FEEDBACK_PATH)
            df_all = pd.concat([df_old, df_new], ignore_index=True)
        else:
            df_all = df_new
        df_all.to_csv(FEEDBACK_PATH, index=False)
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.post('/train')
def train():
    global pipe
    try:
        # Base data
        df_base = pd.DataFrame(DATA, columns=['text','label'])
        # Feedback data (if any)
        if os.path.exists(FEEDBACK_PATH):
            df_fb = pd.read_csv(FEEDBACK_PATH)
            df_fb = df_fb[['text','label']].dropna()
            df_all = pd.concat([df_base, df_fb], ignore_index=True)
        else:
            df_all = df_base
        X = df_all['text']
        y = df_all['label']
        # Refit pipeline
        pipe = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1,2), min_df=1)),
            ('clf', LogisticRegression(max_iter=1000))
        ])
        pipe.fit(X, y)
        return jsonify({'ok': True, 'samples': int(len(df_all))})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.get('/')
def root():
    return jsonify({'ok': True, 'service': 'ml-classifier'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
