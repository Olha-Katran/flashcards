import { configureStore } from '@reduxjs/toolkit'
import { flashcardsApi } from '../services/api'

export const store = configureStore({
  reducer: {
    [flashcardsApi.reducerPath]: flashcardsApi.reducer,
  },
  middleware: (gDM) => gDM().concat(flashcardsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
