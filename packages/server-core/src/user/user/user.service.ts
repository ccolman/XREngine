import _ from 'lodash'

import { UserInterface } from '@xrengine/common/src/interfaces/User'

import { Application } from '../../../declarations'
import config from '../../appconfig'
import logger from '../../logger'
import { User } from './user.class'
import userDocs from './user.docs'
import hooks from './user.hooks'
import createModel from './user.model'

declare module '@xrengine/common/declarations' {
  /**
   * Interface for users input
   */
  interface ServiceTypes {
    user: User
  }
}

export default (app: Application): void => {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    multi: true
  }

  const event = new User(options, app)
  event.docs = userDocs

  app.use('user', event)

  const service = app.service('user')

  service.hooks(hooks)

  // when seeding db, no need to patch users
  if (config.db.forceRefresh) return

  /**
   * This method find all users
   * @returns users
   */

  // @ts-ignore
  service.publish('patched', async (data: UserInterface, params): Promise<any> => {
    try {
      const groupUsers = await app.service('group-user').Model.findAll({
        where: {
          userId: data.id
        }
      })
      const userRelationships = await app.service('user-relationship').Model.findAll({
        where: {
          userRelationshipType: 'friend',
          relatedUserId: data.id
        }
      })

      let targetIds = [data.id!]
      const updatePromises: any[] = []

      if (data.instanceId != null || params.params?.instanceId != null) {
        const layerUsers = await app.service('user').Model.findAll({
          where: {
            instanceId: data.instanceId || params.params?.instanceId
          }
        })
        targetIds = targetIds.concat(layerUsers.map((user) => user.id))
      }

      groupUsers.forEach((groupUser) => {
        updatePromises.push(
          app.service('group-user').patch(groupUser.id, {
            groupUserRank: groupUser.groupUserRank
          })
        )
        targetIds.push(groupUser.userId)
      })
      // userRelationships.forEach((userRelationship) => {
      //   updatePromises.push(
      //     app.service('user-relationship').patch(
      //       userRelationship.id,
      //       {
      //         userRelationshipType: userRelationship.userRelationshipType,
      //         userId: userRelationship.userId
      //       },
      //       params
      //     )
      //   )
      //   targetIds.push(userRelationship.userId)
      //   targetIds.push(userRelationship.relatedUserId)
      // })

      await Promise.all(updatePromises)
      targetIds = _.uniq(targetIds)
      return Promise.all(
        targetIds.map((userId: string) => {
          return app.channel(`userIds/${userId}`).send({
            userRelationship: data
          })
        })
      )
    } catch (err) {
      logger.error(err)
      throw err
    }
  })
}
