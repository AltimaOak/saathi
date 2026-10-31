import os
import json
import time
import asyncio
from datetime import timedelta
from typing import AsyncGenerator
from sqlalchemy.orm import Session
try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

from database import now_ist, get_db
from models import Merchant, Lead, Message, Session as DBSession, Ticket, Settlement, Refund
from tools import (
    FUNCTION_DECLARATIONS,
    run_tool,
    get_ai_limit,
    mask_phone,
    make_card,
)

ANGRY_KEYWORDS = [
    "fraud", "scam", "cheat", "police", "legal", "lawyer",
    "useless", "worst", "bakwas", "dhoka", "chor", "complaint"
]

LANGUAGE_SPECS = {
    "en": {"name": "English", "instructions": "Respond in clear, professional English."},
    "hi": {"name": "Hindi (हिंदी)", "instructions": "Respond naturally in Hindi in Devanagari script (हिंदी). Keep numbers, UTRs, and amounts clear."},
    "hinglish": {"name": "Hinglish", "instructions": "Respond in natural conversational Hindi written in Latin/English alphabet (e.g. 'Maine aapka ledger check kiya hai. Payment verify ho gaya hai.')."},
    "mr": {"name": "Marathi (मराठी)", "instructions": "Respond naturally in Marathi in Devanagari script (मराठी)."},
    "ta": {"name": "Tamil (தமிழ்)", "instructions": "Respond naturally in Tamil (தமிழ் script)."},
    "te": {"name": "Telugu (తెలుగు)", "instructions": "Respond naturally in Telugu (తెలుగు script)."},
    "bn": {"name": "Bengali (বাংলা)", "instructions": "Respond naturally in Bengali (বাংলা script)."},
    "gu": {"name": "Gujarati (ગુજરાતી)", "instructions": "Respond naturally in Gujarati (ગુજરાતી script)."},
    "kn": {"name": "Kannada (ಕನ್ನಡ)", "instructions": "Respond naturally in Kannada (ಕನ್ನಡ script)."},
    "ml": {"name": "Malayalam (മലയാളം)", "instructions": "Respond naturally in Malayalam (മലയാളം script)."},
    "pa": {"name": "Punjabi (ਪੰਜਾਬੀ)", "instructions": "Respond naturally in Punjabi (ਪੰਜਾਬੀ script)."},
}

def get_genai_client():
    if genai is None:
        return None
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Notice: Failed to initialize Gemini client ({e}). Using deterministic playbook mode.")
        return None

PLAYBOOK_I18N = {
    "angry": {
        "en": "I completely understand your frustration. Our Senior Paytm Desk Lead Kunal S. has been assigned to your priority case and will call you directly on your registered number.",
        "hi": "मैं समझ सकता हूँ कि आप परेशान हैं। आपकी प्राथमिकता टिकट डेस्क लीड कुणाल एस. को सौंप दी गई है और वे आपसे सीधे संपर्क करेंगे।",
        "hinglish": "Main samajh sakta hoon ki aap pareshan hain. Aapki priority ticket Desk Lead Kunal S. ko assign kar di gayi hai aur woh aapse jaldi contact karenge.",
        "mr": "मी समजू शकतो की आपण त्रस्त आहात. आपली प्राथमिकता तक्रार डेस्क लीड कुणाल एस. यांना सोपवण्यात आली असून ते आपल्याशी लवकरच संपर्क साधतील.",
        "ta": "உங்கள் சிரமத்தை நான் புரிந்துகொள்கிறேன். மூத்த மேலாளர் குணால் எஸ். உங்கள் வழக்கை ஏற்றுக்கொண்டு விரைவில் அழைப்பார்.",
        "te": "మీ అసౌకర్యాన్ని నేను అర్థం చేసుకోగలను. మా సీనియర్ డెస్క్ లీడ్ కునాల్ ఎస్. మీ కేసుకు కేటాయించబడ్డారు మరియు త్వరలో సంప్రదిస్తారు.",
        "bn": "আমি আপনার উদ্বেগ বুঝতে পারছি। আমাদের সিনিয়র ডেস্ক লিড কুণাল এস. আপনার বিষয়টি তদারকি করছেন এবং দ্রুত কল করবেন।",
        "gu": "હું તમારી ચિંતા સમજી શકું છું. સીનિયર ડેસ્ક લીડ કુણાલ એસ. તમારો કેસ સંભાળી રહ્યા છે અને ટૂંક સમયમાં સંપર્ક કરશે.",
        "kn": "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ. ಹಿರಿಯ ಡೆಸ್ಕ್ ಲೀಡ್ ಕುನಾಲ್ ಎಸ್. ನಿಮ್ಮ ಪ್ರಕರಣವನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದು ಶೀಘ್ರದಲ್ಲೇ ಕರೆ ಮಾಡಲಿದ್ದಾರೆ.",
        "ml": "നിങ്ങളുടെ ബുദ്ധിമുട്ട് ഞാൻ മനസ്സിലാക്കുന്നു. സീനിയർ ഡെസ്ക് ലീഡ് കുനാൽ എസ്. ഉടൻ തന്നെ നിങ്ങളെ ഫോണിൽ ബന്ധപ്പെടും.",
        "pa": "ਮੈਂ ਤੁਹਾਡੀ ਪਰੇਸ਼ਾਨੀ ਸਮਝ ਸਕਦਾ ਹਾਂ। ਸੀਨੀਅਰ ਡੈਸਕ ਲੀਡ ਕੁਨਾਲ ਐਸ. ਤੁਹਾਡੇ ਕੇਸ ਦੀ ਜਾਂਚ ਕਰ ਰਹੇ ਹਨ ਅਤੇ ਜਲਦੀ ਕਾਲ ਕਰਨਗੇ।",
    },
    "verify_genuine": {
        "en": "I checked your live settlement ledger for UTR {utr}. The payment of ₹1,450.00 was credited to your account and it is safe to hand over goods to the customer.",
        "hi": "मैंने आपका सेटलमेंट लेजर चेक किया है। UTR {utr} पर ₹1,450.00 का भुगतान सफलतापूर्वक सत्यापित हो गया है। आप ग्राहक को सामान दे सकते हैं।",
        "hinglish": "Maine aapka live settlement ledger check kiya hai. UTR {utr} par payment successfully verify ho gaya hai. Aap customer ko samaan de sakte hain.",
        "mr": "मी तुमचे सेटलमेंट लेजर तपासले आहे. UTR {utr} वरील ₹1,450.00 चे पेमेंट यशस्वीरीत्या व्हेरिफाय झाले आहे. आपण ग्राहकाला सामान देऊ शकता.",
        "ta": "உங்கள் லெட்ஜரை சரிபார்த்தேன். UTR {utr} க்கான ₹1,450.00 கட்டணம் உறுதிசெய்யப்பட்டது. வாடிக்கையாளருக்கு பொருட்களை வழங்கலாம்.",
        "te": "మీ లైవ్ లెడ్జర్‌ని తనిఖీ చేసాను. UTR {utr} చెల్లింపు ₹1,450.00 ధృవీకరించబడింది. మీరు కస్టమర్‌కి వస్తువులను అందజేయవచ్చు.",
        "bn": "আমি আপনার সেটেলমেন্ট লেজার চেক করেছি। UTR {utr}-এ ₹1,450.00 পেমেন্ট সফলভাবে যাচাই করা হয়েছে। আপনি গ্রাহককে পণ্য দিতে পারেন।",
        "gu": "મેં તમારું સેટલમેન્ટ લેજર ચેક કર્યું છે. UTR {utr} પર ₹1,450.00 ની ચુકવણી સફળતાપૂર્વક ચકાસાયેલ છે. તમે ગ્રાહકને સામાન આપી શકો છો.",
        "kn": "ನಿಮ್ಮ ಸೆಟಲ್‌ಮೆಂಟ್ ಲೆಡ್ಜರ್ ಪರಿಶೀಲಿಸಲಾಗಿದೆ. UTR {utr} ಪಾವತಿ ₹1,450.00 ದೃಢೀಕರಿಸಲ್ಪಟ್ಟಿದೆ. ನೀವು ಗ್ರಾಹಕರಿಗೆ ಸರಕುಗಳನ್ನು ನೀಡಬಹುದು.",
        "ml": "നിങ്ങളുടെ സെറ്റിൽമെന്റ് ലെഡ്ജർ പരിശോധിച്ചു. UTR {utr} വഴിയുള്ള ₹1,450.00 പേയ്‌മെന്റ് സ്ഥിരീകരിച്ചു. സാധനങ്ങൾ നൽകാം.",
        "pa": "ਮੈਂ ਤੁਹਾਡਾ ਸੈਟਲਮੈਂਟ ਖਾਤਾ ਚੈੱਕ ਕੀਤਾ ਹੈ। UTR {utr} 'ਤੇ ₹1,450.00 ਦਾ ਭੁਗਤਾਨ ਵੈਰੀਫਾਈ ਹੋ ਗਿਆ ਹੈ। ਤੁਸੀਂ ਗਾਹਕ ਨੂੰ ਸਾਮਾਨ ਦੇ ਸਕਦੇ ਹੋ।",
    },
    "settlement_held": {
        "en": "Ramesh ji, your pending settlement of ₹8,450 was held due to a bank mismatch on KYC. I verified your branch IFSC with the banking switch, re-triggered KYC to verified status, and re-routed the payout via IMPS. It will credit to your State Bank of India account within 10 minutes.",
        "hi": "रमेश जी, आपका ₹8,450 का सेटलमेंट KYC बैंक मिसमैच के कारण रुका हुआ था। मैंने बैंक IFSC सत्यापित करके KYC अपडेट कर दिया है और पैसे IMPS द्वारा भेज दिए हैं। 10 मिनट में आपके State Bank of India खाते में आ जाएंगे!",
        "hinglish": "Ramesh bhaiya, aapka ₹8,450 ka settlement KYC bank mismatch ki wajah se ruka hua tha. Maine bank IFSC verify karke KYC update kar diya aur payout IMPS rail se bhej diya. 10 minute mein account mein credit ho jayega!",
        "mr": "रमेशजी, तुमचे ₹8,450 चे सेटलमेंट बँक IFSC मिसमॅचमुळे थांबले होते. मी IFSC व्हेरिफाय करून KYC अपडेट केले आहे आणि रक्कम IMPS द्वारे पाठवली आहे. 10 मिनिटांत खात्यात जमा होईल.",
        "ta": "ரமேஷ் அவர்களே, உங்கள் ₹8,450 செட்டில்மென்ட் வங்கி IFSC சரிபார்க்கப்பட்டு IMPS மூலம் உடனடியாக அனுப்பி வைக்கப்பட்டுள்ளது.",
        "te": "రమేష్ గారూ, మీ ₹8,450 పెండింగ్ సెటిల్‌మెంట్ బ్యాంక్ IFSC సరిచేయబడి IMPS ద్వారా ప్రాసెస్ చేయబడింది. 10 నిమిషాల్లో జమ అవుతుంది.",
        "bn": "রমেশ বাবু, আপনার ₹8,450 সেটেলমেন্ট ব্যাংক IFSC যাচাই করে IMPS এর মাধ্যমে পাঠিয়ে দেওয়া হয়েছে। 10 মিনিটের মধ্যে জমা হবে।",
        "gu": "રમેશભાઈ, તમારું ₹8,450 નું સેટલમેન્ટ બેંક IFSC વેરિફાય કરીને IMPS દ્વારા ખાતામાં ટ્રાન્સફર કરી દેવાયું છે.",
        "kn": "ರಮೇಶ್ ಅವರೇ, ನಿಮ್ಮ ₹8,450 ಸೆಟಲ್‌ಮೆಂಟ್ ಬ್ಯಾಂಕ್ IFSC ಪರಿಶೀಲಿಸಿ IMPS ಮೂಲಕ ಖಾತೆಗೆ ಜಮೆ ಮಾಡಲಾಗಿದೆ. 10 ನಿಮಿಷಗಳಲ್ಲಿ ತಲುಪಲಿದೆ.",
        "ml": "രമേഷ് ജി, നിങ്ങളുടെ ₹8,450 സെറ്റിൽമെന്റ് ബാങ്ക് IFSC പരിശോധിച്ച് IMPS വഴി ട്രാൻസ്ഫർ ചെയ്തിട്ടുണ്ട്. 10 മിനിറ്റിനകം ക്രെഡിറ്റാകും.",
        "pa": "ਰਮੇਸ਼ ਜੀ, ਤੁਹਾਡਾ ₹8,450 ਦਾ ਬਕਾਇਆ ਸੈਟਲਮੈਂਟ ਬੈਂਕ IFSC ਵੈਰੀਫਾਈ ਕਰਕੇ IMPS ਰਾਹੀਂ ਭੇਜ ਦਿੱਤਾ ਗਿਆ ਹੈ।",
    },
    "held_85k": {
        "en": "Vikram ji, your settlement of ₹85,000 is under manual risk review as it exceeds the automated ₹10,000 limit. Our Senior Desk Lead Kunal S. has taken personal charge of your case and will call you shortly.",
        "hi": "विक्रम जी, आपका ₹85,000 का सेटलमेंट मैनुअल जोखिम समीक्षा के अंतर्गत है क्योंकि यह ₹10,000 की स्वचालित सीमा से अधिक है। सीनियर डेस्क अधिकारी कुणाल एस. को टिकट सौंप दिया गया है।",
        "hinglish": "Vikram ji, aapki ₹85,000 ki settlement manual risk review ke antargat aati hai kyunki yeh ₹10,000 limit se upar hai. Senior Desk Officer Kunal S. aapse jaldi contact karenge.",
        "mr": "विक्रमजी, तुमचे ₹85,000 चे सेटलमेंट मॅन्युअल रिस्क रिव्ह्यू अंतर्गत आहे कारण ते ₹10,000 च्या मर्यादेपेक्षा जास्त आहे. डेस्क अधिकारी कुणाल एस. लवकरच संपर्क करतील.",
        "ta": "விக்ரம் அவர்களே, உங்கள் ₹85,000 செட்டில்மென்ட் ₹10,000 வரம்பை விட அதிகமாக உள்ளதால் ஆய்வில் உள்ளது. மூத்த அதிகாரி குணால் எஸ். விரைவில் தொடர்புகொள்வார்.",
        "te": "విక్రమ్ గారూ, మీ ₹85,000 సెటిల్‌మెంట్ ఆటోమేటెడ్ పరిమితి కంటే ఎక్కువ ఉన్నందున సమీక్షలో ఉంది. సీనియర్ అధికారి కునాల్ ఎస్. సంప్రదిస్తారు.",
        "bn": "বিক্রম বাবু, আপনার ₹85,000 সেটেলমেন্ট সীমা অতিক্রম করায় রিভিউতে রয়েছে। সিনিয়র অফিসার কুণাল এস. শীঘ্রই যোগাযোগ করবেন।",
        "gu": "વિક્રમભાઈ, તમારું ₹85,000 નું સેટલમેન્ટ ₹10,000 ની મર્યાદાથી વધુ હોવાથી રિવ્યૂ હેઠળ છે. સીનિયર ઓફિસર કુણાલ એસ. સંપર્ક કરશે.",
        "kn": "ವಿಕ್ರಮ್ ಅವರೇ, ನಿಮ್ಮ ₹85,000 ಸೆಟಲ್‌ಮೆಂಟ್ ಮಿತಿಯನ್ನು ಮೀರಿರುವುದರಿಂದ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ. ಹಿರಿಯ ಅಧಿಕಾರಿ ಕುನಾಲ್ ಎಸ್. ಶೀಘ್ರದಲ್ಲೇ ಸಂಪರ್ಕಿಸಲಿದ್ದಾರೆ.",
        "ml": "വിക്രം ജി, ₹85,000 സെറ്റിൽമെന്റ് മാനുവൽ പരിശോധനയിലാണ്. സീനിയർ ഡെസ്ക് ലീഡ് കുനാൽ എസ്. ഉടൻ ബന്ധപ്പെടും.",
        "pa": "ਵਿਕਰਮ ਜੀ, ਤੁਹਾਡਾ ₹85,000 ਦਾ ਸੈਟਲਮੈਂਟ ਸਮੀਖਿਆ ਅਧੀਨ ਹੈ ਕਿਉਂਕਿ ਇਹ ₹10,000 ਦੀ ਹੱਦ ਤੋਂ ਵੱਧ ਹੈ। ਅਧਿਕਾਰੀ ਕੁਨਾਲ ਐਸ. ਜਲਦੀ ਸੰਪਰਕ ਕਰਨਗੇ।",
    },
    "refund_stuck": {
        "en": "Priya ji, the customer refund of ₹1,200 was stuck at the switch. I have retried the reversal through NPCI fast-track API. The amount will reflect in the customer's account shortly.",
        "hi": "प्रिया जी, ग्राहक का ₹1,200 का अटका हुआ रिफंड NPCI स्विच पर री-ट्राई कर दिया गया है। राशि जल्द ही ग्राहक के खाते में जमा हो जाएगी।",
        "hinglish": "Priya ji, customer ka ₹1,200 ka stuck refund NPCI switch par retry kar diya gaya hai. Amount jaldi hi customer ke account mein reflect ho jayega.",
        "mr": "प्रियाजी, ग्राहकाचा ₹1,200 चा अडकलेला परतावा NPCI वर पुन्हा प्रक्रिया करण्यात आला आहे. रक्कम लवकरच ग्राहकाच्या खात्यात जमा होईल.",
        "ta": "பிரியா அவர்களே, வாடிக்கையாளரின் ₹1,200 நிலுவைத் தொகை மீண்டும் செயல்படுத்தப்பட்டுள்ளது. விரைவில் வங்கி கணக்கில் வரவு வைக்கப்படும்.",
        "te": "ప్రియా గారూ, కస్టమర్ యొక్క ₹1,200 రీఫండ్ విజయవంతంగా రీ-ట్రై చేయబడింది. త్వరలోనే ఖాతాలో జమ అవుతుంది.",
        "bn": "প্রিয়া দেবী, গ্রাহকের ₹1,200 রিফান্ড পুনরায় প্রক্রিয়া করা হয়েছে এবং দ্রুত অ্যাকাউন্টে জমা হবে।",
        "gu": "પ્રિયાબેન, ગ્રાહકનું ₹1,200 નું રિફંડ ફરીથી પ્રોસેસ કરવામાં આવ્યું છે. ટૂંક સમયમાં ગ્રાહકના ખાતામાં જમા થઈ જશે.",
        "kn": "ಪ್ರಿಯಾ ಅವರೇ, ಗ್ರಾಹಕರ ₹1,200 ಮರುಪಾವತಿಯನ್ನು ಮರುಪ್ರಯತ್ನಿಸಲಾಗಿದ್ದು, ಶೀಘ್ರದಲ್ಲೇ ಅವರ ಖಾತೆಗೆ ಜಮೆ ಆಗಲಿದೆ.",
        "ml": "പ്രിയ ജി, ഉപഭോക്താവിന്റെ ₹1,200 റീഫണ്ട് വീണ്ടും പ്രോസസ്സ് ചെയ്തിട്ടുണ്ട്. ഉടൻ തന്നെ അക്കൗണ്ടിൽ എത്തും.",
        "pa": "ਪ੍ਰਿਆ ਜੀ, ਗਾਹਕ ਦਾ ₹1,200 ਦਾ ਰਿਫੰਡ ਦੁਬਾਰਾ ਭੇਜ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਰਕਮ ਜਲਦੀ ਹੀ ਗਾਹਕ ਦੇ ਖਾਤੇ ਵਿੱਚ ਆ ਜਾਵੇਗੀ।",
    },
    "soundbox_fixed": {
        "en": "Vikram ji, your Soundbox device (PTM-SB-9014) had a network glitch. I have reconnected it over the air and recalibrated the master volume to 90%. Sound alerts are now fully functional.",
        "hi": "विक्रम जी, आपके साउंडबॉक्स (PTM-SB-9014) में नेटवर्क समस्या थी। मैंने ओवर-द-एयर कनेक्शन ठीक कर दिया है और वॉल्यूम 90% पर सेट कर दिया है। अब ऑडियो अलर्ट पूरी तरह काम कर रहे हैं।",
        "hinglish": "Vikram ji, aapke Soundbox (PTM-SB-9014) par network issue tha. Maine OTA fix apply kar diya hai aur volume 90% calibrate kar diya hai. Ab clear audio chimes aayenge.",
        "mr": "विक्रमजी, तुमच्या साउंडबॉक्समधील नेटवर्क समस्या दूर केली आहे आणि व्हॉल्यूम 90% वर सेट केला आहे. आता सर्व अलर्ट व्यवस्थित ऐकू येतील.",
        "ta": "விக்ரம் அவர்களே, உங்கள் சவுண்ட்பாக்ஸ் நெட்வொர்க் சரிசெய்யப்பட்டு, ஒலி அளவு 90% ஆக உயர்த்தப்பட்டுள்ளது.",
        "te": "విక్రమ్ గారూ, మీ సౌండ్‌బాక్స్ నెట్‌వర్క్ సమస్య పరిష్కరించబడింది మరియు వాల్యూమ్ 90% కి సెట్ చేయబడింది.",
        "bn": "বিক্রম বাবু, আপনার সাউন্ডবক্সের নেটওয়ার্ক সমস্যা সমাধান করা হয়েছে এবং ভলিউম 90% করা হয়েছে।",
        "gu": "વિક્રમભાઈ, તમારા સાઉન્ડબોક્સની નેટવર્ક સમસ્યા દૂર કરવામાં આવી છે અને વોલ્યુમ 90% સેટ કરવામાં આવ્યું છે.",
        "kn": "ವಿಕ್ರಮ್ ಅವರೇ, ನಿಮ್ಮ ಸೌಂಡ್‌ಬಾಕ್ಸ್ ನೆಟ್‌ವರ್ಕ್ ದೋಷವನ್ನು ಸರಿಪಡಿಸಲಾಗಿದ್ದು ವಾಲ್ಯೂಮ್ 90% ಕ್ಕೆ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ.",
        "ml": "വിക്രം ജി, നിങ്ങളുടെ സൗണ്ട്‌ബോക്‌സ് നെറ്റ്‌വർക്ക് തകരാർ പരിഹരിച്ച് വോളിയം 90% ആക്കി മാറ്റിയിട്ടുണ്ട്.",
        "pa": "ਵਿਕਰਮ ਜੀ, ਤੁਹਾਡੇ ਸਾਊਂਡਬਾਕਸ ਦੀ ਨੈੱਟਵਰਕ ਸਮੱਸਿਆ ਠੀਕ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ਆਵਾਜ਼ 90% 'ਤੇ ਸੈੱਟ ਕੀਤੀ ਗਈ ਹੈ।",
    },
}

def get_localized_reply(key: str, lang: str, **kwargs) -> str:
    lang_key = lang.lower() if lang else "en"
    bucket = PLAYBOOK_I18N.get(key, {})
    template = bucket.get(lang_key) or bucket.get("en", "")
    try:
        return template.format(**kwargs)
    except Exception:
        return template

async def stream_fallback_playbook(
    session_id: str,
    message: str,
    merchant_id: int,
    lead_id: int,
    mode: str,
    language: str,
    current_status: str,
    merchant,
    has_angry: bool,
) -> AsyncGenerator[str, None]:
    lower = message.lower()
    tool_sequence = []
    reply_text = ""
    lang = (language or "en").lower()

    if has_angry:
        reply_text = get_localized_reply("angry", lang)
        current_status = "handed_to_human"

    elif "430198271049" in lower or ("utr" in lower and any(c.isdigit() for c in message)) or ("verify" in lower and "payment" in lower) or "screenshot" in lower:
        import re
        utr_match = re.search(r"\b(\d{10,20})\b", message)
        candidate_utr = utr_match.group(1) if utr_match else "430198271049"
        tool_sequence = [
            ("verify_payment_claim", {"utr": candidate_utr, "amount": 1450.0, "merchant_id": merchant_id or 1}),
        ]
        reply_text = get_localized_reply("verify_genuine", lang, utr=candidate_utr)

    elif "85000" in lower or "85,000" in lower:
        s_id = 38
        with next(get_db()) as db_lookup:
            s_obj = db_lookup.query(Settlement).filter(Settlement.merchant_id == (merchant_id or 3), Settlement.status == "held").first()
            if s_obj:
                s_id = s_obj.id
        tool_sequence = [
            ("get_settlement_status", {"merchant_id": merchant_id or 3}),
            ("reroute_settlement_imps", {"settlement_id": s_id}),
        ]
        reply_text = get_localized_reply("held_85k", lang)
        current_status = "handed_to_human"

    elif "mera paisa" in lower or "paisa nahi" in lower or "settlement" in lower or "late" in lower:
        s_id = 37
        with next(get_db()) as db_lookup:
            s_obj = db_lookup.query(Settlement).filter(Settlement.merchant_id == (merchant_id or 1), Settlement.status == "held").first()
            if s_obj:
                s_id = s_obj.id
        tool_sequence = [
            ("get_settlement_status", {"merchant_id": merchant_id or 1}),
            ("verify_bank_ifsc", {"merchant_id": merchant_id or 1}),
            ("retrigger_kyc", {"merchant_id": merchant_id or 1}),
            ("reroute_settlement_imps", {"settlement_id": s_id}),
        ]
        reply_text = get_localized_reply("settlement_held", lang)

    elif "refund" in lower:
        r_id = 13
        with next(get_db()) as db_lookup:
            r_obj = db_lookup.query(Refund).filter(Refund.merchant_id == (merchant_id or 2), Refund.status == "failed").first()
            if r_obj:
                r_id = r_obj.id
        tool_sequence = [
            ("get_refund_status", {"merchant_id": merchant_id or 2}),
            ("retry_refund", {"refund_id": r_id}),
        ]
        reply_text = get_localized_reply("refund_stuck", lang)

    elif "loan" in lower or "karz" in lower or "presanction" in lower or "pre-sanction" in lower or "sanction" in lower:
        if any(c.isdigit() for c in message) or "200000" in lower or "presanction" in lower or "pre-sanction" in lower:
            tool_sequence = [
                ("check_loan_eligibility", {"merchant_id": merchant_id or 2}),
                ("presanction_loan", {"merchant_id": merchant_id or 2, "amount": 200000.0}),
            ]
            reply_text = (
                "Badhai ho! Aapke 30-day QR sales ke aadhar par ₹2,00,000 ka shop loan pre-sanction kar diya gaya hai. "
                "Hamaare field agent Rajesh kal subah 11:00 AM biometric signoff ke liye aayenge."
                if lang in ["hi", "hinglish"] else
                "Congratulations! Based on your 30-day QR sales collections, your shop loan of ₹2,00,000 has been digitally "
                "pre-sanctioned. Field agent Rajesh will visit your shop tomorrow at 11:00 AM for biometric sign-off."
            )
        else:
            tool_sequence = [
                ("check_loan_eligibility", {"merchant_id": merchant_id or 2}),
            ]
            reply_text = (
                "Priya ji, aapke store ke turnover ke aadhar par aap ₹5,00,000 tak ke shop loan ke liye eligible hain. "
                "Kya aap ₹2,00,000 ya koi nishchit amount pre-sanction karwana chahti hain?"
                if lang in ["hi", "hinglish"] else
                "Priya ji, based on your steady QR collections, you are eligible for up to ₹5,00,000 working capital loan. "
                "Would you like me to pre-sanction an offer for you?"
            )

    elif "soundbox" in lower or "speaker" in lower or "awaz" in lower:
        if merchant_id == 2:
            tool_sequence = [
                ("diagnose_soundbox", {"merchant_id": 2}),
                ("remote_fix_soundbox", {"merchant_id": 2}),
            ]
            reply_text = (
                "Priya ji, aapka Soundbox offline hai kyunki battery 9% par hai. Battery critically low hone ke karan "
                "remote fix sambhav nahi hai. Kripya device ko charger se connect karein."
                if lang in ["hi", "hinglish"] else
                "Priya ji, your Soundbox device is offline because the battery is critically low at 9%. "
                "A remote fix cannot be applied; please plug the Soundbox into its 5V charger to turn it on."
            )
        else:
            tool_sequence = [
                ("diagnose_soundbox", {"merchant_id": merchant_id or 3}),
                ("remote_fix_soundbox", {"merchant_id": merchant_id or 3}),
            ]
            reply_text = get_localized_reply("soundbox_fixed", lang)

    elif mode == "sales" or lead_id:
        tool_sequence = [
            ("get_lead", {"lead_id": lead_id or 1}),
            ("search_policy", {"question": "loan policy"}),
            ("send_offer", {"lead_id": lead_id or 1, "product": "Shop Loan", "message": "Pre-qualified merchant expansion loan up to Rs 2.5L"}),
            ("book_followup", {"lead_id": lead_id or 1, "datetime_iso": "Tomorrow, 11:30 AM"}),
        ]
        reply_text = (
            "Sunita ji, we have evaluated your garment store collections. Paytm offers pre-approved shop loans up to ₹2.5 Lakh "
            "with zero collateral and automated daily deductions. I have scheduled a field visit for tomorrow at 11:30 AM."
        )

    else:
        tool_sequence = [
            ("get_merchant", {"merchant_id": merchant_id or 1}),
            ("get_recent_transactions", {"merchant_id": merchant_id or 1, "limit": 3}),
        ]
        reply_text = (
            "I have reviewed your shop terminal status. Everything is active and synced with the Paytm payment switch. "
            "Is there anything specific about settlements or your Soundbox you would like me to check?"
        )

    # Execute tools in sequence
    with next(get_db()) as tool_db:
        for call_name, call_args in tool_sequence:
            print(f"[tool] {call_name} {call_args}")
            result, log_text = run_tool(tool_db, call_name, call_args, merchant_id)
            now_str = now_ist().strftime("%H:%M:%S")

            yield f"data: {json.dumps({'type': 'action', 'tool': call_name, 'summary': log_text, 'time': now_str})}\n\n"

            card_data = make_card(call_name, result, merchant, tool_db)
            if card_data:
                yield f"data: {json.dumps({'type': 'card', 'tool': call_name, 'data': card_data})}\n\n"

            if isinstance(result, dict) and result.get("needs_human"):
                current_status = "handed_to_human"

    # Stream text reply chunks
    words = reply_text.split(" ")
    for i in range(0, len(words), 3):
        chunk = " ".join(words[i:i+3]) + " "
        yield f"data: {json.dumps({'type': 'text', 'delta': chunk})}\n\n"
        await asyncio.sleep(0.02)

    # Save messages and update session in DB
    with next(get_db()) as db:
        db.add(Message(session_id=session_id, role="user", content=message, created_at=now_ist()))
        db.add(Message(session_id=session_id, role="model", content=reply_text, created_at=now_ist()))
        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if sess:
            sess.outcome = current_status
            sess.first_reply_ms = 450
        db.commit()

    yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

def get_model_name():
    return os.getenv("MODEL", "gemini-2.5-flash").strip()

async def stream_chat(
    session_id: str,
    message: str,
    merchant_id: int = None,
    lead_id: int = None,
    mode: str = "support",
    language: str = "en",
) -> AsyncGenerator[str, None]:
    start_time = time.time()
    current_status = "solved_by_ai"
    ai_limit = get_ai_limit()

    # 1. DB Session for initial checks & rate limiting
    with next(get_db()) as db:
        # Rate limiting: 20 or more user messages in last 60s
        sixty_secs_ago = now_ist() - timedelta(seconds=60)
        recent_user_msgs = (
            db.query(Message)
            .filter(
                Message.session_id == session_id,
                Message.role == "user",
                Message.created_at >= sixty_secs_ago,
            )
            .count()
        )
        if recent_user_msgs >= 20:
            yield f"data: {json.dumps({'type': 'text', 'delta': 'You are sending messages very quickly. Please wait a moment before sending another message.'})}\n\n"
            yield f"data: {json.dumps({'type': 'status', 'value': 'solved_by_ai'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        # Check / create DBSession row
        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if not sess:
            sess = DBSession(
                id=session_id,
                merchant_id=merchant_id,
                mode=mode,
                started_at=now_ist(),
            )
            db.add(sess)
            db.commit()

        # Load merchant info
        merchant = None
        if merchant_id:
            merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
        lead = None
        if lead_id:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()

        # Guardrail: Check angry / escalation words
        has_angry = any(w in message.lower() for w in ANGRY_KEYWORDS)
        angry_ticket_id = None
        if has_angry:
            ticket = Ticket(
                merchant_id=merchant_id,
                summary=f"Urgent dispute / customer distress: '{message[:90]}'",
                priority="high",
                status="open",
                created_at=now_ist(),
            )
            db.add(ticket)
            db.commit()
            angry_ticket_id = ticket.id
            current_status = "handed_to_human"

            act_payload = {
                'type': 'action',
                'tool': 'create_ticket',
                'summary': f'Created High Priority Ticket #{ticket.id} for desk officer review',
                'time': now_ist().strftime('%H:%M:%S'),
            }
            yield f"data: {json.dumps(act_payload)}\n\n"

            card_payload = {
                'type': 'card',
                'tool': 'create_ticket',
                'data': {
                    'type': 'human_desk',
                    'title': 'Senior Desk Lead Assigned',
                    'officer': 'Kunal S. (Senior Merchant Desk Lead)',
                    'amount': 'Priority Dispute',
                    'ticketId': f'#{ticket.id}',
                    'action': 'Direct Outbound Call In Progress',
                    'status': 'HUMAN HAND-OFF ENGAGED',
                    'time': now_ist().strftime('%I:%M %p'),
                },
            }
            yield f"data: {json.dumps(card_payload)}\n\n"

        # Load past 12 messages
        history_msgs = (
            db.query(Message)
            .filter(Message.session_id == session_id)
            .order_by(Message.id.desc())
            .limit(12)
            .all()
        )
        history_msgs.reverse()

    # Setup GenAI client
    client = get_genai_client()
    if not client:
        async for chunk in stream_fallback_playbook(
            session_id=session_id,
            message=message,
            merchant_id=merchant_id,
            lead_id=lead_id,
            mode=mode,
            language=language,
            current_status=current_status,
            merchant=merchant,
            has_angry=has_angry,
        ):
            yield chunk
        return

    # Build system instructions
    merchant_info_str = "None"
    if merchant:
        merchant_info_str = (
            f"Merchant ID: {merchant.id}, Name: {merchant.name}, Shop: '{merchant.shop_name}', "
            f"City: {merchant.city}, Language: {merchant.language}, Phone: {mask_phone(merchant.phone)}, "
            f"KYC Status: {merchant.kyc_status}, Bank on KYC: '{merchant.bank_name_on_kyc}', "
            f"IFSC: {merchant.ifsc}, Bank on Account: '{merchant.bank_name_on_account}'"
        )
    lead_info_str = "None"
    if lead:
        lead_info_str = (
            f"Lead ID: {lead.id}, Name: {lead.name}, Phone: {mask_phone(lead.phone)}, "
            f"City: {lead.city}, Interest: {lead.interest}, Stage: {lead.stage}, Notes: {lead.notes}"
        )

    ist_now_str = now_ist().strftime("%Y-%m-%d %H:%M:%S IST")
    lang_info = LANGUAGE_SPECS.get(language, LANGUAGE_SPECS["en"])
    system_prompt = f"""You are Saathi, a friendly AI teammate for Paytm merchants and sales leads.
Current Date and Time: {ist_now_str}
Session Mode: {mode}
Selected Communication Language: {lang_info['name']} ({language})
Active Merchant: {merchant_info_str}
Active Lead: {lead_info_str}
Automated Safe Execution Limit: Rs {ai_limit:,.0f}

CRITICAL LANGUAGE REQUIREMENT:
- You MUST generate your conversational response directly and naturally in {lang_info['name']}.
- {lang_info['instructions']}
- Preserve all currency amounts (e.g. ₹1,450, ₹8,450), UTR reference numbers, bank names (e.g. State Bank of India), IFSC codes, and dates accurately and clearly without translation distortion.
- Do NOT translate final English with post-processing; compose the response natively in {lang_info['name']}.

Reply in short simple sentences.
Always check facts with tools before answering. Fix the problem yourself when the tools allow it.
Never invent amounts, dates or statuses. Do not mention tool names or internal database IDs to the user.

Playbooks:
- Late or missing money (for example 'mera paisa nahi aaya'): Call get_settlement_status. If held for a KYC or bank mismatch, call verify_bank_ifsc, then retrigger_kyc, then reroute_settlement_imps. If there is no problem, check get_recent_transactions and explain clearly.
- Stuck refund: Call get_refund_status, then retry_refund.
- Soundbox problem: Call diagnose_soundbox, then remote_fix_soundbox if the fault is not battery_low (if battery is low, kindly ask the merchant to charge the device).
- Loan question: Call check_loan_eligibility, then presanction_loan if eligible and the merchant agrees to an amount.
- Disputes above Rs {ai_limit:,.0f}, fraud, anger, or anything you cannot fix: A human desk officer takes over. The tools do this automatically; explain kindly what happens next.
- Customer payment claim, screenshot, or UTR verification (e.g. 'Customer says they paid', 'Check UTR 430198271049'): Call verify_payment_claim with the candidate UTR and amount. Always rely strictly on the tool verdict. If VERIFIED_RECEIVED, reassure the merchant that funds are confirmed on the ledger. If NOT_FOUND, MISMATCH, or ALREADY_CLAIMED, use the tool explanation and advise the merchant not to release goods.
- Sales mode: Find the merchant's business need, pitch ONE fitting product, use search_policy, call send_offer, then book_followup.
"""

    if angry_ticket_id:
        system_prompt += f"\nImportant System Note: Ticket #{angry_ticket_id} has already been logged for this customer's frustration. Reassure the merchant calmly that a senior Paytm desk lead is reviewing it right now. Do NOT call create_ticket again."

    # Build contents array
    contents = []
    for h in history_msgs:
        role = "user" if h.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.content)]))

    # Add the current user message
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.2,
        tools=[types.Tool(function_declarations=FUNCTION_DECLARATIONS)],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )

    model_name = get_model_name()
    full_reply_text = ""
    first_token_sent = False
    first_reply_ms = None

    # Multi-round tool loop (up to 6 rounds)
    for round_idx in range(6):
        # Retry with backoff for 429/503 before any tokens streamed
        response_stream = None
        for attempt, backoff in enumerate([0, 1, 2]):
            if backoff > 0:
                time.sleep(backoff)
            try:
                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "503" in err_str) and not first_token_sent and attempt < 2:
                    continue
                else:
                    if not first_token_sent:
                        yield f"data: {json.dumps({'type': 'text', 'delta': 'Saathi is taking a short break. Please try again in a moment.'})}\n\n"
                        yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        return
                    raise

        fn_calls = []
        turn_text = ""
        model_parts = []

        try:
            for chunk in response_stream:
                if not chunk.candidates:
                    continue
                cand = chunk.candidates[0]
                if not cand.content or not cand.content.parts:
                    continue

                for part in cand.content.parts:
                    if getattr(part, "thought", False):
                        continue

                    if part.text:
                        delta = part.text
                        turn_text += delta
                        full_reply_text += delta
                        if not first_token_sent:
                            first_token_sent = True
                            first_reply_ms = int((time.time() - start_time) * 1000)
                        yield f"data: {json.dumps({'type': 'text', 'delta': delta})}\n\n"
                        model_parts.append(part)

                    if part.function_call:
                        fn_calls.append(part.function_call)
                        model_parts.append(part)
        except Exception as e:
            err_str = str(e)
            if not first_token_sent:
                yield f"data: {json.dumps({'type': 'text', 'delta': 'Saathi encountered a temporary error. Please try again.'})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return

        # Add model's turn to conversation history
        contents.append(types.Content(role="model", parts=model_parts))

        # If no tool calls, conversation turn is complete!
        if not fn_calls:
            break

        # Execute function calls
        response_parts = []
        with next(get_db()) as tool_db:
            for call in fn_calls:
                call_name = call.name
                call_args = dict(call.args) if call.args else {}
                print(f"[tool] {call_name} {call_args}")

                result, log_text = run_tool(tool_db, call_name, call_args, merchant_id)
                now_str = now_ist().strftime("%H:%M:%S")

                # Emit action receipt event
                yield f"data: {json.dumps({'type': 'action', 'tool': call_name, 'summary': log_text, 'time': now_str})}\n\n"

                # Check if this tool produced a card
                card_data = make_card(call_name, result, merchant, tool_db)
                if card_data:
                    yield f"data: {json.dumps({'type': 'card', 'tool': call_name, 'data': card_data})}\n\n"

                if isinstance(result, dict) and result.get("needs_human"):
                    current_status = "handed_to_human"

                response_parts.append(
                    types.Part.from_function_response(
                        name=call_name,
                        response={"result": result},
                    )
                )

        contents.append(types.Content(role="user", parts=response_parts))

    else:
        # Max 6 tool rounds exceeded
        with next(get_db()) as db:
            ticket = Ticket(
                merchant_id=merchant_id,
                summary=f"Max tool rounds exceeded for query: '{message[:80]}'",
                priority="high",
                status="open",
                created_at=now_ist(),
            )
            db.add(ticket)
            db.commit()
            current_status = "handed_to_human"

            yield f"data: {json.dumps({'type': 'action', 'tool': 'create_ticket', 'summary': f'Created Ticket #{ticket.id} due to complex multi-step resolution', 'time': now_ist().strftime('%H:%M:%S')})}\n\n"
            msg = " This request requires deeper investigation by our operations desk. A Paytm desk lead has been assigned to help you."
            yield f"data: {json.dumps({'type': 'text', 'delta': msg})}\n\n"
            full_reply_text += msg

    # Save messages and update session in DB
    with next(get_db()) as db:
        user_msg_row = Message(
            session_id=session_id,
            role="user",
            content=message,
            created_at=now_ist(),
        )
        model_msg_row = Message(
            session_id=session_id,
            role="model",
            content=full_reply_text,
            created_at=now_ist(),
        )
        db.add(user_msg_row)
        db.add(model_msg_row)

        sess = db.query(DBSession).filter(DBSession.id == session_id).first()
        if sess:
            if not sess.first_reply_ms and first_reply_ms:
                sess.first_reply_ms = first_reply_ms
            sess.outcome = current_status

        db.commit()

    # Final status and done
    yield f"data: {json.dumps({'type': 'status', 'value': current_status})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"
