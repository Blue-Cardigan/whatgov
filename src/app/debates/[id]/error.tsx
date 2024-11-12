'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Error Loading Debate</h2>
                <p className="text-gray-600 mb-4">{error.message}</p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Try again
                </button>
            </div>
        </div>
    );
} 