import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend"

# The routes requested
routes = [
    "app/(auth)/login",
    "app/(auth)/register",
    "app/patient/home",
    "app/patient/appointments",
    "app/patient/prescriptions",
    "app/patient/billing",
    "app/patient/profile",
    "app/receptionist/home",
    "app/receptionist/register-patient",
    "app/receptionist/schedule",
    "app/receptionist/queue",
    "app/receptionist/billing",
    "app/doctor/home",
    "app/doctor/appointments",
    "app/doctor/patients",
    "app/doctor/consultation",
    "app/doctor/profile",
    "app/admin/home",
    "app/admin/doctors",
    "app/admin/patients",
    "app/admin/appointments",
    "app/admin/billing",
    "components",
    "lib"
]

for r in routes:
    os.makedirs(os.path.join(base_dir, r), exist_ok=True)

files = {
    "package.json": """{
  "name": "hospital-management-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.1"
  }
}""",
    "next.config.mjs": """/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
""",
    "tsconfig.json": """{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}""",
    "app/layout.tsx": """export const metadata = {
  title: 'Hospital Management System',
  description: 'Manage your hospital efficiently.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}""",
    "app/page.tsx": """import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Hospital Management System</h1>
      <p>Welcome! Please select your portal:</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <li><Link href="/login">Login</Link></li>
        <li><Link href="/patient/home">Patient Portal</Link></li>
        <li><Link href="/doctor/home">Doctor Portal</Link></li>
        <li><Link href="/receptionist/home">Receptionist Portal</Link></li>
        <li><Link href="/admin/home">Admin Portal</Link></li>
      </ul>
    </main>
  );
}""",
    "components/Sidebar.tsx": """export default function Sidebar() {
  return (
    <aside style={{ width: '250px', background: '#eee', padding: '1rem', height: '100vh' }}>
      <h2>Sidebar Navigation</h2>
      <nav>
        {/* Navigation links will go here */}
      </nav>
    </aside>
  );
}""",
    "components/DashboardCard.tsx": """export default function DashboardCard({ title, value }: { title: string, value: string | number }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
      <h3>{title}</h3>
      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );
}""",
    "lib/api.ts": """const API_BASE_URL = 'http://localhost:8000';

export async function fetchAPI(endpoint: string, options = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!res.ok) throw new Error('API Request Failed');
  return res.json();
}"""
}

# Generate pages for all routes
for r in routes:
    if r.startswith("app"):
        route_path = r.replace("app/", "")
        title_case = " ".join([word.capitalize() for word in route_path.replace("(auth)/", "").replace("/", " ").split("-")])
        page_content = f"""export default function Page() {{
  return (
    <div style={{{{ padding: '2rem' }}}}>
      <h1>{title_case}</h1>
      <p>This is the {route_path} page.</p>
    </div>
  );
}}"""
        files[f"{r}/page.tsx"] = page_content

for fpath, content in files.items():
    full_path = os.path.join(base_dir, fpath)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Successfully generated {len(files)} files in frontend structure.")
