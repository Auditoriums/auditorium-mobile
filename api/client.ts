import {ApolloClient, createHttpLink, from, InMemoryCache, makeVar, split} from "@apollo/client";
import {ACCESS_RIGHTS, Langs, Mode, User} from "../models/models";
import {WebSocketLink} from '@apollo/client/link/ws';
import {getMainDefinition} from "@apollo/client/utilities";
import {setContext} from "@apollo/client/link/context";
import {getItem} from "./asyncStorage";
import {onError} from "@apollo/client/link/error";

const wsLink: any = new WebSocketLink({
    uri: 'wss://api.auditoriu.me/',
    options: {
      reconnect: true,
      connectionParams: async () => {
        const token = await getItem('token');
        return {
          authorization: token ? `Bearer ${token}` : "",
        }
      }
    }
  }
);

const subscriptionMiddleware = {
  applyMiddleware: async (options: any, next: any) => {
    const token = await getItem('token');
    options.authorization = token ? `Bearer ${token}` : ""
    next()
  },
}

wsLink.subscriptionClient.use([subscriptionMiddleware]);

const httpLink = createHttpLink({
  uri: 'https://api.auditoriu.me/'
});

const authLink = setContext(async function (_, {headers}) {
  const token = await getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const splitLink = split(
  ({query}) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      alert(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );

  if (networkError) noConnectionVar(true);
});

export const client = new ApolloClient({
  link: from([errorLink, authLink.concat(splitLink)]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          me: {
            read() {
              return meVar();
            },
          },
          lang: {
            read() {
              return langVar();
            },
          },
          accessRights: {
            read() {
              return accessRightsVar();
            },
          },
          mode: {
            read() {
              return modeVar();
            },
          },
          minimalClassroomIds: {
            read() {
              return minimalClassroomIdsVar();
            },

          },
          desirableClassroomIds: {
            read() {
              return desirableClassroomIdsVar();
            },
          },
          isMinimalSetup: {
            read() {
              return isMinimalSetupVar();
            },
          },
          pushNotificationToken: {
            read() {
              return pushNotificationTokenVar();
            },
          },
          noConnection: {
            read() {
              return noConnectionVar();
            },
          },
        },
      },
    },
  }),
});

export const meVar = makeVar<User | null>(null);
export const langVar = makeVar<Langs>(Langs.UA);
export const accessRightsVar = makeVar(ACCESS_RIGHTS.USER);
export const modeVar = makeVar(Mode.PRIMARY);
export const minimalClassroomIdsVar = makeVar<number[]>([]);
export const desirableClassroomIdsVar = makeVar<number[]>([]);
export const isMinimalSetupVar = makeVar(true);
export const pushNotificationTokenVar = makeVar('');
export const noConnectionVar = makeVar(false);