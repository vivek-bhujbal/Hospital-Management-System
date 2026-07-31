import os
import glob
import re

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend\app"

pages_with_forms = glob.glob(os.path.join(base_dir, "**", "*.tsx"), recursive=True)

import_statements = """
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
"""

for path in pages_with_forms:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "<form action=" in content:
        # Add imports
        if "ClientForm" not in content:
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    lines.insert(i, import_statements.strip())
                    break
            content = '\n'.join(lines)
            
        # Replace form tags
        content = re.sub(r'<form action=\{([^\}]+)\}([^>]*)>', r'<ClientForm action={\1}\2>', content)
        content = content.replace('</form>', '</ClientForm>')
        
        # Replace submit buttons
        content = re.sub(r'<button type="submit"([^>]*)>', r'<SubmitButton\1>', content)
        # We need to replace </button> that belong to the submit button.
        # This is tricky with regex, but since we know SubmitButton is now used, we can just replace </button> that follows a SubmitButton?
        # Actually, in most generated code, it's just <button type="submit" ...>Text</button>.
        # We can just do a regex replace for the whole tag:
        # <button type="submit" className="...">Text</button> -> <SubmitButton className="...">Text</SubmitButton>
        content = re.sub(r'<SubmitButton([^>]*)>(.*?)</button>', r'<SubmitButton\1>\2</SubmitButton>', content, flags=re.DOTALL)
        
        # Add required to inputs that should be required if not already
        # Our forms mostly have `required` already, but let's ensure dates have min
        content = content.replace('type="date" name="appt_date" required className=', 'type="date" name="appt_date" required min={new Date().toISOString().split("T")[0]} className=')
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Refactored forms in {path}")
