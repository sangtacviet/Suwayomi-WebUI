/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SliceCreator } from '@/lib/zustand/Zustand.types.ts';

export type ReaderTranslatorStoreSlice = {
    translator: {
        isEnabled: boolean;
        setIsEnabled: (enabled: boolean) => void;
        reset: () => ReaderTranslatorStoreSlice;
    };
};

const DEFAULT_STATE = {
    isEnabled: false,
} satisfies Omit<ReaderTranslatorStoreSlice['translator'], 'setIsEnabled' | 'reset'>;

export const createReaderTranslatorStoreSlice = <T extends ReaderTranslatorStoreSlice>(
    ...[createActionName, set, get]: Parameters<SliceCreator<T>>
): ReaderTranslatorStoreSlice => ({
    translator: {
        ...DEFAULT_STATE,
        reset: () => ({ translator: { ...get().translator, ...DEFAULT_STATE } }),
        setIsEnabled: (enabled) =>
            set(
                (draft) => {
                    draft.translator.isEnabled = enabled;
                },
                undefined,
                createActionName('setIsEnabled'),
            ),
    },
});
