import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "kalp_auth_token";

async function checkAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
        redirect("/login");
    }

    try {
        verifyToken(token);
    } catch {
        redirect("/login");
    }
}

export default async function ProposalViewLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await checkAuth();

    // Render completely outside the dashboard layout
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
