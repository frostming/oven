import { createThemeAction } from 'remix-themes'

import { themeSessionResolver } from '~/lib/theme'

export const action = createThemeAction(themeSessionResolver)
