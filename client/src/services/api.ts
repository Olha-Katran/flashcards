import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  Flashcard,
  FlashcardDraft,
  FlashcardGroup,
  GroupMode,
  GroupSummary,
  AiGenerateRequest,
} from '../types'

const baseUrl = import.meta.env.VITE_API_URL ?? ''

export const flashcardsApi = createApi({
  reducerPath: 'flashcardsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${baseUrl}/api`,
  }),
  tagTypes: ['Group', 'GroupList'],
  endpoints: (builder) => ({
    listGroups: builder.query<GroupSummary[], void>({
      query: () => '/groups',
      providesTags: [{ type: 'GroupList', id: 'LIST' }],
    }),
    getGroup: builder.query<FlashcardGroup, string>({
      query: (id) => `/groups/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Group', id }],
    }),
    createGroup: builder.mutation<
      FlashcardGroup,
      {
        title: string
        flashcards?: FlashcardDraft[]
        mode?: GroupMode
        frontLang?: string
        backLang?: string
      }
    >({
      query: (body) => ({
        url: '/groups',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'GroupList', id: 'LIST' }],
    }),
    updateGroup: builder.mutation<
      FlashcardGroup,
      {
        id: string
        title?: string
        flashcards?: Array<
          FlashcardDraft & { id?: string; status?: Flashcard['status'] }
        >
        mode?: GroupMode
        frontLang?: string
        backLang?: string
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/groups/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Group', id },
        { type: 'GroupList', id: 'LIST' },
      ],
    }),
    deleteGroup: builder.mutation<void, string>({
      query: (id) => ({
        url: `/groups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Group', id },
        { type: 'GroupList', id: 'LIST' },
      ],
    }),
    patchFlashcard: builder.mutation<
      Flashcard,
      { groupId: string; cardId: string; status: Flashcard['status'] }
    >({
      query: ({ groupId, cardId, status }) => ({
        url: `/groups/${groupId}/flashcards/${cardId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'GroupList', id: 'LIST' },
      ],
    }),
    generateAi: builder.mutation<
      { flashcards: FlashcardDraft[] },
      AiGenerateRequest
    >({
      query: (body) => ({
        url: '/ai/generate',
        method: 'POST',
        body,
      }),
    }),
    validateAnswer: builder.mutation<
      { correct: boolean; feedback: string },
      {
        userAnswer: string
        correctAnswer: string
        englishWord: string
        mode?: GroupMode
        frontLang?: string
        backLang?: string
      }
    >({
      query: (body) => ({
        url: '/ai/validate-answer',
        method: 'POST',
        body,
      }),
    }),
    generateFromPdf: builder.mutation<
      { flashcards: FlashcardDraft[] },
      FormData
    >({
      query: (body) => ({
        url: '/ai/generate-from-pdf',
        method: 'POST',
        body,
        formData: true,
      }),
    }),
    completeExam: builder.mutation<
      { group: FlashcardGroup; passed: boolean },
      { groupId: string; score: number }
    >({
      query: ({ groupId, score }) => ({
        url: `/groups/${groupId}/exam/complete`,
        method: 'POST',
        body: { score },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [
        { type: 'Group', id: groupId },
        { type: 'GroupList', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useListGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  usePatchFlashcardMutation,
  useGenerateAiMutation,
  useGenerateFromPdfMutation,
  useValidateAnswerMutation,
  useCompleteExamMutation,
} = flashcardsApi
