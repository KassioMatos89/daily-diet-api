import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function melasRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnDiet: z.boolean(),
    })

    const { name, description, isOnDiet } = createMealBodySchema.parse(
      request.body,
    )

    const sessionId = request.cookies.sessionId

    const user = await knex('users').where('session_id', sessionId).first()

    if (!user) throw new Error('User not found')

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      is_on_diet: isOnDiet,
      user_id: user.id,
    })

    return reply.status(201).send()
  })

  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const user = await knex('users').where('session_id', sessionId).first()

    if (!user) throw new Error('User not found')

    const meals = await knex('meals').where('user_id', user.id).select('*')

    return { meals }
  })

  app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const getMealParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getMealParamsSchema.parse(request.params)

    const sessionId = request.cookies.sessionId
    if (!sessionId) throw new Error('sessionId is required')

    const user = await knex('users').where('session_id', sessionId).first()
    if (!user) throw new Error('User not found')

    const meal = await knex('meals').where({
      id,
      user_id: user.id,
    })

    return { meal }
  })

  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const sessionId = request.cookies.sessionId
      if (!sessionId) throw new Error('sessionId is required')

      const user = await knex('users').where('session_id', sessionId).first()
      if (!user) throw new Error('User not found')

      await knex('meals')
        .where({
          id,
          user_id: user.id,
        })
        .delete()

      return reply.status(204).send()
    },
  )

  app.put('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
    const getMealParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getMealParamsSchema.parse(request.params)

    const sessionId = request.cookies.sessionId
    if (!sessionId) throw new Error('sessionId is required')

    const user = await knex('users').where('session_id', sessionId).first()
    if (!user) throw new Error('User not found')

    const meal = await knex('meals')
      .where({
        id,
        user_id: user.id,
      })
      .first()

    if (!meal) throw new Error('Meal not found')

    const updateMealBodySchema = z.object({
      name: z.string().nullable(),
      description: z.string().nullable(),
      isOnDiet: z.boolean(),
      date: z.string().nullable(),
    })

    console.log(request.body, meal.date)

    const { name, description, isOnDiet, date } = updateMealBodySchema.parse(
      request.body,
    )

    await knex('meals')
      .where({
        id,
        user_id: user.id,
      })
      .update({
        name: name ?? meal.name,
        description: description ?? meal.description,
        is_on_diet: isOnDiet ?? meal.is_on_diet,
        date: date ?? meal.date,
      })
  })
}
