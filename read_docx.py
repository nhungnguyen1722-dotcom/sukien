import zipfile
import xml.etree.ElementTree as ET
import sys

def get_docx_text(path):
    try:
        document = zipfile.ZipFile(path)
        xml_content = document.read('word/document.xml')
        document.close()
        tree = ET.XML(xml_content)
        
        NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        TEXT = NAMESPACE + 't'
        
        paragraphs = []
        for paragraph in tree.iter(NAMESPACE + 'p'):
            texts = [node.text
                     for node in paragraph.iter(TEXT)
                     if node.text]
            if texts:
                paragraphs.append(''.join(texts))
                
        return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

print(get_docx_text(sys.argv[1]))
