import os
import re

login_path = r'c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend\app\(auth)\login\page.tsx'
reg_path = r'c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend\app\(auth)\register\page.tsx'

import_statements = """
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
"""

for path in [login_path, reg_path]:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "ClientForm" not in content:
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import '):
                lines.insert(i, import_statements.strip())
                break
        content = '\n'.join(lines)
        
    content = re.sub(r'<form action=\{([^\}]+)\}([^>]*)>', r'<ClientForm action={\1}\2>', content)
    content = content.replace('</form>', '</ClientForm>')
    
    content = re.sub(r'<button type="submit"([^>]*)>', r'<SubmitButton\1>', content)
    content = re.sub(r'<SubmitButton([^>]*)>(.*?)</button>', r'<SubmitButton\1>\2</SubmitButton>', content, flags=re.DOTALL)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Auth forms refactored")
