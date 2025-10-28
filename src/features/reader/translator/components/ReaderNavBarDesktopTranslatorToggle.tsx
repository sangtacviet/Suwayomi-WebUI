/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { ChangeEvent, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useReaderTranslatorStore } from '@/features/reader/stores/ReaderStore.ts';

const BaseReaderNavBarDesktopTranslatorToggle = () => {
    const { t } = useTranslation();
    const { isEnabled, setIsEnabled } = useReaderTranslatorStore((state) => ({
        isEnabled: state.translator.isEnabled,
        setIsEnabled: state.translator.setIsEnabled,
    }));

    const handleChange = useCallback(
        (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => setIsEnabled(checked),
        [setIsEnabled],
    );

    return (
        <FormControlLabel
            control={<Switch color="primary" checked={isEnabled} onChange={handleChange} />}
            label={t('reader.settings.label.translator')}
            sx={{ ml: 0 }}
        />
    );
};

export const ReaderNavBarDesktopTranslatorToggle = memo(BaseReaderNavBarDesktopTranslatorToggle);
