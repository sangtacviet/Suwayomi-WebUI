/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Stack from '@mui/material/Stack';
import { useEffect, useState } from 'react';
import { IReaderSettingsWithDefaultFlag, ReaderSettingsTypeProps } from '@/features/reader/Reader.types.ts';
import { ReaderService } from '@/features/reader/services/ReaderService';
import { ButtonSelectInput } from '@/base/components/inputs/ButtonSelectInput.tsx';
import { ValueToDisplayData } from '@/base/Base.types.ts';

enum TargetLanguage {
    VIETNAMESE = 'vi',
    ENGLISH = 'en',
}

const VALUE_TO_DISPLAY_DATA: ValueToDisplayData<TargetLanguage> = {
    [TargetLanguage.VIETNAMESE]: {
        isTitleString: true,
        title: 'Vietnamese',
        icon: null,
    },
    [TargetLanguage.ENGLISH]: {
        isTitleString: true,
        title: 'English',
        icon: null,
    },
};

const TARGET_LANGUAGE_VALUES = Object.values(TargetLanguage);
const TRANSLATOR_TARGET_LANGUAGE_KEY = 'translator.targetLanguage';

export const ReaderTranslatorSettings = ({
    settings,
    updateSetting,
    onDefault,
}: {
    settings: IReaderSettingsWithDefaultFlag;
    updateSetting: (
        ...args: Parameters<typeof ReaderService.updateSetting>
    ) => ReturnType<typeof ReaderService.updateSetting>;
} & ReaderSettingsTypeProps) => {
    // Initialize state from localStorage or default to Vietnamese
    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(() => {
        const saved = localStorage.getItem(TRANSLATOR_TARGET_LANGUAGE_KEY);
        return (saved as TargetLanguage) || TargetLanguage.VIETNAMESE;
    });

    // Save to localStorage whenever targetLanguage changes
    useEffect(() => {
        localStorage.setItem(TRANSLATOR_TARGET_LANGUAGE_KEY, targetLanguage);
    }, [targetLanguage]);

    // Reference settings, updateSetting, and onDefault to prevent unused variable warnings
    // These will be used when proper reader settings are added for translator
    const unused = { settings, updateSetting, onDefault };
    if (unused) {
        // Do nothing
    }

    return (
        <Stack sx={{ gap: 2 }}>
            <ButtonSelectInput
                label="Target Language"
                value={targetLanguage}
                values={TARGET_LANGUAGE_VALUES}
                setValue={setTargetLanguage}
                valueToDisplayData={VALUE_TO_DISPLAY_DATA}
            />
        </Stack>
    );
};
