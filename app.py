import re
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Cache mechanism to avoid hitting Google servers on every micro-request
cache = {
    "timestamp": 0,
    "data": None
}
CACHE_DURATION = 300  # 5 minutes cache default unless refresh requested

def clean_extracted_text(text_str):
    if not text_str:
        return ""
    # Clean multiple spaces and whitespace around punctuation
    cleaned = re.sub(r'\s+', ' ', text_str)
    cleaned = re.sub(r'\s+([,.!?;:])', r'\1', cleaned)
    return cleaned.strip()

def fetch_and_parse_notes():
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    resp = requests.get(FEED_URL, headers=headers, timeout=15)
    resp.raise_for_status()
    
    root = ET.fromstring(resp.content)
    parsed_notes = []
    note_id = 0
    
    for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
        date_el = entry.find('{http://www.w3.org/2005/Atom}title')
        date_str = date_el.text.strip() if date_el is not None and date_el.text else "Unknown Date"
        
        link_el = entry.find('{http://www.w3.org/2005/Atom}link')
        link = link_el.attrib.get('href', '') if link_el is not None else ''
        
        content_el = entry.find('{http://www.w3.org/2005/Atom}content')
        html_content = content_el.text if content_el is not None and content_el.text else ''
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        headers_found = soup.find_all('h3')
        if headers_found:
            for h3 in headers_found:
                raw_type = h3.get_text(strip=True)
                # Normalize type
                note_type = raw_type
                if note_type.lower() == 'change':
                    note_type = 'Changed'
                
                sibling_html = []
                sibling_text = []
                curr = h3.next_sibling
                while curr and curr.name != 'h3':
                    if curr.name in ['p', 'ul', 'ol', 'div']:
                        sibling_html.append(str(curr))
                        sibling_text.append(curr.get_text(separator=' ', strip=True))
                    curr = curr.next_sibling
                
                full_html = ''.join(sibling_html)
                full_text = clean_extracted_text(' '.join(sibling_text))
                
                # Fallback if no sibling elements caught
                if not full_text:
                    full_html = str(soup)
                    full_text = clean_extracted_text(soup.get_text(separator=' ', strip=True))
                
                note_id += 1
                parsed_notes.append({
                    'id': f"note-{note_id}",
                    'date': date_str,
                    'type': note_type,
                    'html': full_html,
                    'text': full_text,
                    'link': link
                })
        else:
            text = clean_extracted_text(soup.get_text(separator=' ', strip=True))
            if text:
                note_id += 1
                parsed_notes.append({
                    'id': f"note-{note_id}",
                    'date': date_str,
                    'type': 'General',
                    'html': html_content,
                    'text': text,
                    'link': link
                })
                
    return parsed_notes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or cache["data"] is None or (now - cache["timestamp"] > CACHE_DURATION):
        try:
            notes = fetch_and_parse_notes()
            cache["data"] = notes
            cache["timestamp"] = now
        except Exception as e:
            if cache["data"] is not None:
                # Return cached data with warning if fetch fails
                return jsonify({
                    'success': True,
                    'notes': cache["data"],
                    'warning': f"Failed to fetch live feed: {str(e)}. Showing cached data.",
                    'last_updated': cache["timestamp"]
                })
            return jsonify({'success': False, 'error': str(e)}), 500
            
    return jsonify({
        'success': True,
        'notes': cache["data"],
        'last_updated': cache["timestamp"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
