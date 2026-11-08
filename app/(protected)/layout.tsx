import { AuthGate } from '@/components/auth-gate'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) { return <AuthGate>{children}</AuthGate> }
