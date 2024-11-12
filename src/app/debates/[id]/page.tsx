import { DebateView } from '@/components/debates/DebateView';
import { Suspense } from 'react';

export const revalidate = 3600 // Revalidate every hour

export async function generateStaticParams() {
    // Pre-generate popular debates
    return ['debate1', 'debate2'].map((id) => ({ id }))
}

function ErrorDisplay({ error }: { error: Error }) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Error Loading Debate</h2>
                <p className="text-gray-600">{error.message}</p>
            </div>
        </div>
    );
}

export default async function DebatePage({
    params,
}: {
    params: { id: string }
}) {
    const { id } = await params;
    
    return (
        <main className="container mx-auto py-6 h-[calc(100vh-4rem)]">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="text-xl mb-2">Loading debate...</div>
                        <div className="text-gray-600">This may take a few moments</div>
                    </div>
                </div>
            }>
                <DebateView debateSectionExtId={id} />
            </Suspense>
        </main>
    )
}
