import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[10%] right-[-5%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-8 bg-white/60 backdrop-blur-lg p-12 rounded-3xl shadow-xl border border-white/50">
        <div className="p-4 bg-blue-100 rounded-2xl mb-4 shadow-inner">
          <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 drop-shadow-sm tracking-tight pb-2">
          Hospital Management
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
          A unified, state-of-the-art platform connecting patients, doctors, and administration. Log in once, and we&apos;ll take you exactly where you need to be.
        </p>

        <div className="pt-8 w-full max-w-md flex flex-col gap-4">
          <Link href="/login" className="w-full group flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-300">
            Sign In to Portal
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
          
          <Link href="/register" className="w-full bg-white text-slate-700 font-medium text-lg py-4 px-8 rounded-xl border-2 border-slate-200 hover:border-blue-200 hover:bg-slate-50 transition-all duration-300">
            Create an Account
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-slate-400 text-sm font-medium">
        &copy; {new Date().getFullYear()} HMS Platform. All rights reserved.
      </div>
    </main>
  );
}
