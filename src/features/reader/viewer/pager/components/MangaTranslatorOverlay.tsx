/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { ReaderStatePages } from '@/features/reader/Reader.types.ts';
import { useResizeObserver } from '@/base/hooks/useResizeObserver.tsx';
import { useReaderAutoScrollStore } from '@/features/reader/stores/ReaderStore.ts';

const TRANSLATOR_URL = 'https://sangtacviet.app/comictranslator.php?isolated=true&langhint=auto';
const LAZY_PREFIX = 'LAZY:';
const FRAME_READY_DELAY_MS = 500;
const ARRAY_BUFFER_CHUNK_SIZE = 0x8000;
const TRANSLATOR_TARGET_LANGUAGE_KEY = 'translator.targetLanguage';

type MangaTranslatorOverlayProps = {
    pages: ReaderStatePages['pages'];
    isCurrentChapter: boolean;
    isPreloadMode: boolean;
    isVisible: boolean;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let offset = 0; offset < bytes.length; offset += ARRAY_BUFFER_CHUNK_SIZE) {
        const chunk = bytes.subarray(offset, offset + ARRAY_BUFFER_CHUNK_SIZE);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
};

export const MangaTranslatorOverlay = ({
    pages,
    isCurrentChapter,
    isPreloadMode,
    isVisible,
}: MangaTranslatorOverlayProps) => {
    const [isFrameReady, setIsFrameReady] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [targetLanguage, setTargetLanguage] = useState<string>(() => {
        const saved = localStorage.getItem(TRANSLATOR_TARGET_LANGUAGE_KEY);
        return saved || 'vi';
    });
    const translatorFrameRef = useRef<HTMLIFrameElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const loadTimeoutRef = useRef<number | undefined>(undefined);
    const imageUrlMapRef = useRef<Map<string, string>>(new Map());
    const imageDataCacheRef = useRef<Map<string, string>>(new Map());
    const loadingPromisesRef = useRef<Map<string, Promise<string>>>(new Map());
    const scrollElement = useReaderAutoScrollStore((state) => state.autoScroll.scrollRef?.current ?? null);

    const lazyImageIdentifiers = useMemo(() => pages.map(({ primary }) => `${LAZY_PREFIX}${primary.index}`), [pages]);

    useEffect(() => {
        const urlMap = new Map<string, string>();
        pages.forEach(({ primary }) => {
            urlMap.set(String(primary.index), primary.url);
        });
        imageUrlMapRef.current = urlMap;
        imageDataCacheRef.current.clear();
        loadingPromisesRef.current.clear();
    }, [pages]);

    const postMessage = useCallback((message: Record<string, unknown>) => {
        const frameWindow = translatorFrameRef.current?.contentWindow;
        if (!frameWindow) {
            return;
        }

        frameWindow.postMessage(message, '*');
    }, []);

    useEffect(
        () => () => {
            if (loadTimeoutRef.current) {
                window.clearTimeout(loadTimeoutRef.current);
                loadTimeoutRef.current = undefined;
            }
        },
        [],
    );

    const fetchImageBinary = useCallback(async (identifier: string): Promise<string> => {
        const cached = imageDataCacheRef.current.get(identifier);
        if (cached) {
            return cached;
        }

        const existingPromise = loadingPromisesRef.current.get(identifier);
        if (existingPromise) {
            return existingPromise;
        }

        const imageUrl = imageUrlMapRef.current.get(identifier);
        if (!imageUrl) {
            throw new Error(`No reader image found for translator identifier "${identifier}".`);
        }

        const promise = fetch(imageUrl, { credentials: 'include' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to load reader image for translator. Status ${response.status}.`);
                }

                return response.arrayBuffer();
            })
            .then((buffer) => {
                const base64 = arrayBufferToBase64(buffer);
                imageDataCacheRef.current.set(identifier, base64);
                loadingPromisesRef.current.delete(identifier);
                return base64;
            })
            .catch((error) => {
                loadingPromisesRef.current.delete(identifier);
                throw error;
            });

        loadingPromisesRef.current.set(identifier, promise);
        return promise;
    }, []);

    const handleFrameLoad = useCallback(() => {
        if (loadTimeoutRef.current) {
            window.clearTimeout(loadTimeoutRef.current);
        }

        loadTimeoutRef.current = window.setTimeout(() => {
            setIsFrameReady(true);
        }, FRAME_READY_DELAY_MS);
    }, []);

    useEffect(() => {
        if (!isVisible) {
            setIsFrameReady(false);
        }
    }, [isVisible]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === TRANSLATOR_TARGET_LANGUAGE_KEY && e.newValue) {
                setTargetLanguage(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        if (!isVisible || !isFrameReady || !isCurrentChapter || isPreloadMode || lazyImageIdentifiers.length === 0) {
            return;
        }

        postMessage({ type: 'setComicImgUrls', data: lazyImageIdentifiers });
        postMessage({ type: 'setOriginalLanguage', originalLanguage: 'auto' });
        postMessage({ type: 'setTargetLanguage', targetLanguage });
    }, [isVisible, isFrameReady, isCurrentChapter, isPreloadMode, lazyImageIdentifiers, targetLanguage, postMessage]);

    const resizeObserverCallback = useCallback<ResizeObserverCallback>(
        (entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }

            const { width } = entry.contentRect;
            setContainerWidth(width);

            if (isVisible && isFrameReady && width > 0) {
                postMessage({ type: 'setPageWidth', width: Math.round(width) });
            }
        },
        [isVisible, isFrameReady, postMessage],
    );

    useResizeObserver(rootRef, resizeObserverCallback);

    useEffect(() => {
        if (!isVisible || !isFrameReady || !scrollElement) {
            return undefined;
        }

        const handleScroll = () => {
            postMessage({
                type: 'parentScroll',
                scrollTop: scrollElement.scrollTop,
                scrollHeight: scrollElement.scrollHeight,
                clientHeight: scrollElement.clientHeight,
            });
        };

        handleScroll();
        scrollElement.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            scrollElement.removeEventListener('scroll', handleScroll);
        };
    }, [isVisible, isFrameReady, scrollElement, postMessage]);

    useEffect(() => {
        if (!isVisible || !isFrameReady || containerWidth === 0) {
            return;
        }

        postMessage({ type: 'setPageWidth', width: Math.round(containerWidth) });
    }, [isVisible, isFrameReady, containerWidth, postMessage]);

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            if (!translatorFrameRef.current || event.source !== translatorFrameRef.current.contentWindow) {
                return;
            }

            if (typeof event.data !== 'object' || event.data === null) {
                return;
            }

            const { type, url } = event.data as {
                type?: string;
                url?: string;
                x?: number;
                y?: number;
                button?: number;
            };

            if (type === 'requestLazyImageData' && typeof url === 'string') {
                fetchImageBinary(url)
                    .then((base64) => {
                        translatorFrameRef.current?.contentWindow?.postMessage(
                            {
                                type: 'lazyImageData',
                                url,
                                data: `IMAGERAW:${base64}`,
                            },
                            '*',
                        );
                    })
                    .catch((error) => {
                        // eslint-disable-next-line no-console -- surface translator fetch issues for diagnosis
                        console.error('Failed to provide lazy image data for translator', error);
                    });
            }

            if (type === 'translatorClick') {
                const target = scrollElement ?? rootRef.current ?? document.body;
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    button: event.data.button ?? 0,
                    clientX: event.data.x ?? 0,
                    clientY: event.data.y ?? 0,
                });
                target.dispatchEvent(clickEvent);
            }
        },
        [fetchImageBinary, scrollElement],
    );

    useEffect(() => {
        if (!isVisible) {
            return undefined;
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isVisible, handleMessage]);

    if (!isVisible || !isCurrentChapter || isPreloadMode || pages.length === 0) {
        return null;
    }

    return (
        <Box
            ref={rootRef}
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    bgcolor: (theme) => theme.palette.background.default,
                    pointerEvents: 'auto',
                }}
            >
                <iframe
                    ref={translatorFrameRef}
                    src={TRANSLATOR_URL}
                    title="STV Manga Translator"
                    style={{ width: '100%', height: '100%', border: 0 }}
                    onLoad={handleFrameLoad}
                />
                {!isFrameReady && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}
            </Box>
        </Box>
    );
};
