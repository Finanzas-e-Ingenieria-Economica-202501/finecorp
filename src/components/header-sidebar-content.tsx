"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "./ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import Link from "next/link";

export default function HeaderSidebarContent() {
    // Get the current PATH using Next.js hook
    const currentPath = usePathname();

    // Function to generate breadcrumb items
    const getBreadcrumbItems = (path: string) => {
        // Remove leading slash and split by '/'
        const segments = path.replace(/^\//, '').split('/');
        
        // Filter out 'dashboard' and empty segments
        const filteredSegments = segments.filter(segment => 
            segment && segment.toLowerCase() !== 'dashboard'
        );
        
        // If no segments remain, return empty array (no breadcrumbs)
        if (filteredSegments.length === 0) {
            return [];
        }
        
        // Mapeo de traducciones para términos específicos
        const translations: Record<string, string> = {
            'cash flows': 'Flujos de Caja',
            'cash-flows': 'Flujos de Caja',
            'new': 'Nuevo',
            'edit': 'Editar',
            'home': 'Inicio'
        };
        
        // Build breadcrumb items without dashboard
        const items: { name: string; path: string; isLast: boolean }[] = [];
        
        filteredSegments.forEach((segment, index) => {
            const segmentPath = '/dashboard/' + filteredSegments.slice(0, index + 1).join('/');
            let segmentName = segment
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, char => char.toUpperCase());
            
            // Aplicar traducción si existe
            const lowerSegment = segment.toLowerCase().replace(/[-_]/g, ' ');
            if (translations[lowerSegment]) {
                segmentName = translations[lowerSegment];
            } else if (translations[segment.toLowerCase()]) {
                segmentName = translations[segment.toLowerCase()];
            }
            
            items.push({
                name: segmentName,
                path: segmentPath,
                isLast: index === filteredSegments.length - 1
            });
        });
        
        return items;
    };

    const breadcrumbItems = getBreadcrumbItems(currentPath);

    return (
        <header className="h-16 flex items-center px-4 gap-2">
            <SidebarTrigger />
            
            <Breadcrumb>
                <BreadcrumbList>
                    {breadcrumbItems.map((item) => (
                        <React.Fragment key={item.path}>
                            <BreadcrumbItem>
                                {item.isLast ? (
                                    <BreadcrumbPage>{item.name}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={item.path}>{item.name}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!item.isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
        </header>
    );
}