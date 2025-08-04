import hashlib
import magic
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

def compute_checksum(file_content):
    """Compute SHA-256 checksum for a file"""
    return hashlib.sha256(file_content).hexdigest()

def get_file_content_type(file_content):
    """Determine the content type of a file using python-magic"""
    mime = magic.Magic(mime=True)
    return mime.from_buffer(file_content)

def is_text_file(content_type):
    """Check if a file is a text file based on its content type"""
    text_types = [
        'text/plain', 'text/html', 'text/css', 'text/javascript',
        'application/json', 'application/xml', 'text/xml',
        'application/javascript', 'application/x-javascript'
    ]
    return any(text_type in content_type for text_type in text_types)

def can_compute_similarity(content_type):
    """Check if we can compute similarity for this file type"""
    # Text files
    if is_text_file(content_type):
        return True
    
    # Document files
    document_types = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    return any(doc_type in content_type for doc_type in document_types)

def compute_text_similarity(uploaded_content, existing_content):
    """Compute similarity between text contents using TF-IDF and LSA"""
    try:
        # Convert binary content to text (assuming UTF-8 encoding)
        uploaded_text = uploaded_content.decode('utf-8', errors='ignore')
        existing_text = existing_content.decode('utf-8', errors='ignore')
        
        # If either text is empty, return 0 similarity
        if not uploaded_text.strip() or not existing_text.strip():
            return 0.0
            
        # Create TF-IDF vectors
        vectorizer = TfidfVectorizer(stop_words='english')
        
        # Check if we have enough content to vectorize
        if len(uploaded_text.split()) < 2 or len(existing_text.split()) < 2:
            # For very short content, do direct comparison
            return 100.0 if uploaded_text == existing_text else 0.0
            
        tfidf_matrix = vectorizer.fit_transform([uploaded_text, existing_text])
        
        # If the matrix is empty, return 0
        if tfidf_matrix.nnz == 0:
            return 0.0
            
        # Apply LSA for dimensionality reduction if we have enough features
        if tfidf_matrix.shape[1] > 1:
            n_components = min(100, tfidf_matrix.shape[1] - 1)
            lsa_model = TruncatedSVD(n_components=n_components)
            lsa_matrix = lsa_model.fit_transform(tfidf_matrix)
            
            # Compute cosine similarity
            similarity = cosine_similarity(lsa_matrix[0:1], lsa_matrix[1:2])[0][0]
        else:
            # For single feature, compare directly
            similarity = 1.0 if tfidf_matrix[0,0] == tfidf_matrix[1,0] else 0.0
        
        # Convert to percentage and round to 2 decimal places
        similarity = round(similarity * 100, 2)
        
        return similarity
    except Exception as e:
        print(f"Error computing text similarity: {e}")
        return 0.0