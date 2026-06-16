"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function AuthGuard({ children }) {
    const router = useRouter();
    const [state, setState] = useState("checking"); // checking | authed | unauthed

    useEffect(() => {
        getMe()
            .then(() => setState("authed"))
            .catch(() => { setState("unauthed"); router.replace("/login"); });
    }, [router]);

    if (state === "checking") {
        return (
            <div className="min-h-screen bg-[#fdfcfd] flex items-center justify-center">
                <span className="font-mono text-sm text-slate-300">loading…</span>
            </div>
        );
    }
    if (state === "unauthed") return null;
    return children;
}