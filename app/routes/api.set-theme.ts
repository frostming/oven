import { createThemeAction } from 'remix-themes'

import { themeSessionResolver } from '~/lib/theme.server'

export const action = createThemeAction(themeSessionResolver)
