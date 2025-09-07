import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Error de Autenticación</CardTitle>
            <CardDescription>Hubo un problema al iniciar sesión. Por favor, inténtalo de nuevo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth/login">Volver a Intentar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
