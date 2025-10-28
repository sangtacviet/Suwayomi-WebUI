/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import { memo } from 'react';
import { ReaderPagerProps, ReadingMode } from '@/features/reader/Reader.types.ts';
import { createReaderPage } from '@/features/reader/viewer/pager/ReaderPager.utils.tsx';
import { BasePager } from '@/features/reader/viewer/pager/components/BasePager.tsx';
import { MangaTranslatorOverlay } from '@/features/reader/viewer/pager/components/MangaTranslatorOverlay.tsx';
import { useReaderTranslatorStore } from '@/features/reader/stores/ReaderStore.ts';

const BaseReaderVerticalPager = ({
    onLoad,
    onError,
    pageLoadStates,
    retryFailedPagesKeyPrefix,
    isPreloadMode,
    ...props
}: ReaderPagerProps) => {
    const { currentPageIndex, totalPages, readingMode, pageGap, pages, isCurrentChapter } = props;
    const isTranslatorEnabled = useReaderTranslatorStore((state) => state.translator.isEnabled);

    const isWebtoonMode = readingMode === ReadingMode.WEBTOON;
    const actualPageGap = isWebtoonMode ? 0 : pageGap;
    const shouldShowTranslator = isTranslatorEnabled && isCurrentChapter && !isPreloadMode && pages.length > 0;

    return (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Box
                sx={{
                    position: 'relative',
                    display: 'inline-block',
                    maxWidth: '100%',
                }}
            >
                <Box
                    sx={{
                        opacity: shouldShowTranslator ? 0 : 1,
                        pointerEvents: shouldShowTranslator ? 'none' : 'auto',
                        transition: (theme) =>
                            theme.transitions.create('opacity', {
                                duration: theme.transitions.duration.shorter,
                            }),
                    }}
                >
                    <BasePager
                        {...props}
                        createPage={(page, pagesIndex, shouldLoad, _, setRef, ...baseProps) =>
                            createReaderPage(
                                page,
                                pagesIndex,
                                true,
                                pageLoadStates[page.primary.index].loaded,
                                isPreloadMode,
                                onLoad,
                                onError,
                                shouldLoad,
                                !isPreloadMode,
                                currentPageIndex,
                                totalPages,
                                ...baseProps,
                                pageLoadStates[page.primary.index].error ? retryFailedPagesKeyPrefix : undefined,
                                undefined,
                                undefined,
                                page.primary.index !== 0 ? actualPageGap : 0,
                                setRef,
                            )
                        }
                        slots={{ boxProps: { sx: { margin: 'auto' } } }}
                    />
                </Box>
                <MangaTranslatorOverlay
                    pages={pages}
                    isCurrentChapter={isCurrentChapter}
                    isPreloadMode={isPreloadMode}
                    isVisible={shouldShowTranslator}
                />
            </Box>
        </Box>
    );
};

export const ReaderVerticalPager = memo(BaseReaderVerticalPager);
