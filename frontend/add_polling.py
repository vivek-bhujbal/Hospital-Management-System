import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend"
components_dir = os.path.join(base_dir, "components")

auto_refresh_code = """'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ interval = 5000 }: { interval?: number }) {
  const router = useRouter()
  
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, interval)
    return () => clearInterval(id)
  }, [router, interval])

  return null
}
"""

with open(os.path.join(components_dir, "AutoRefresh.tsx"), "w", encoding="utf-8") as f:
    f.write(auto_refresh_code)

pages_to_update = [
    "app/patient/home/page.tsx",
    "app/patient/appointments/page.tsx",
    "app/patient/billing/page.tsx",
    "app/receptionist/home/page.tsx",
    "app/receptionist/queue/page.tsx",
    "app/receptionist/billing/page.tsx",
    "app/doctor/home/page.tsx",
    "app/doctor/appointments/page.tsx",
    "app/admin/home/page.tsx",
    "app/admin/appointments/page.tsx",
    "app/admin/billing/page.tsx"
]

import_statement = "import AutoRefresh from '@/components/AutoRefresh'\n"
component_tag = "<AutoRefresh interval={5000} />\n      "

for page in pages_to_update:
    path = os.path.join(base_dir, page)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if "AutoRefresh" not in content:
            # Inject import
            lines = content.split('\n')
            # find first import
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    lines.insert(i, import_statement.strip())
                    break
            
            content = '\n'.join(lines)
            
            # Inject component after outermost div
            # Typically: `return (\n    <div className="space-y-6">`
            # or `return (\n    <div className="space-y-8">`
            
            # Let's find `<div className="space-y-`
            target = '<div className="space-y-'
            if target in content:
                idx = content.find(target)
                end_of_div = content.find(">", idx) + 1
                
                new_content = content[:end_of_div] + "\n      " + component_tag.strip() + content[end_of_div:]
                
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {page}")
            else:
                print(f"Could not find injection point in {page}")
    else:
        print(f"File not found: {page}")

print("Polling logic injected successfully.")
