"use client";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "./ui/sidebar";

export default function HeaderSidebarContent() {
    // Get the current PATH using Next.js hook
    const currentPath = usePathname();

    // Function to format path as title
    const getPageTitle = (path: string): string => {
        // Remove leading slash and split by '/'
        const segments = path.replace(/^\//, '').split('/');
        
        // Filter out 'dashboard' and empty segments
        const filteredSegments = segments.filter(segment => 
            segment && segment.toLowerCase() !== 'dashboard'
        );
        
        // If no segments remain, return default title
        if (filteredSegments.length === 0) {
            return 'Dashboard';
        }
        
        // Take the last segment and format it
        const lastSegment = filteredSegments[filteredSegments.length - 1];
        
        // Convert kebab-case or snake_case to Title Case
        return lastSegment
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    return (
        <header className="h-16 flex items-center px-4 gap-2">
            <SidebarTrigger />

            <h1>{getPageTitle(currentPath)}</h1>
        </header>
    );
}