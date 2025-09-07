import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
    isActive: boolean;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    restoreFocus?: boolean;
}

export const useFocusTrap = ({ isActive, initialFocusRef, restoreFocus = true }: UseFocusTrapOptions) => {
    const containerRef = useRef<HTMLElement>(null);
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    // Get all focusable elements within the container
    const getFocusableElements = useCallback((): HTMLElement[] => {
        if (!containerRef.current) return [];

        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        const elements = Array.from(
            containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        );

        // Filter out elements that are not visible or have display: none
        return elements.filter(element => {
            const style = window.getComputedStyle(element);
            return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                element.offsetWidth > 0 &&
                element.offsetHeight > 0
            );
        });
    }, []);

    // Handle Tab key navigation within the modal
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!isActive || event.key !== 'Tab') return;

        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (event.shiftKey) {
            // Shift + Tab: move to previous element
            if (activeElement === firstElement || !focusableElements.includes(activeElement)) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: move to next element
            if (activeElement === lastElement || !focusableElements.includes(activeElement)) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }, [isActive, getFocusableElements]);

    // Set initial focus when modal becomes active
    useEffect(() => {
        if (!isActive) return;

        // Store the previously focused element for restoration later
        previousActiveElementRef.current = document.activeElement as HTMLElement;

        // Set initial focus
        const setInitialFocus = () => {
            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else {
                const focusableElements = getFocusableElements();
                if (focusableElements.length > 0) {
                    focusableElements[0].focus();
                }
            }
        };

        // Use setTimeout to ensure the modal is fully rendered
        const timeoutId = setTimeout(setInitialFocus, 100);

        return () => clearTimeout(timeoutId);
    }, [isActive, initialFocusRef, getFocusableElements]);

    // Restore focus when modal becomes inactive
    useEffect(() => {
        if (isActive) return;

        if (restoreFocus && previousActiveElementRef.current) {
            // Use setTimeout to ensure the modal is fully unmounted
            const timeoutId = setTimeout(() => {
                if (previousActiveElementRef.current) {
                    previousActiveElementRef.current.focus();
                }
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [isActive, restoreFocus]);

    // Add/remove event listeners for keyboard navigation
    useEffect(() => {
        if (isActive) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isActive, handleKeyDown]);

    return containerRef;
};