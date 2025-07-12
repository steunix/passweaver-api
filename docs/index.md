# PassWeaver API

PassWeaver API is a stateless, enterprise-scale, collaborative secrets manager API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

## What is it?

PassWeaver API is a full API server, no GUI or CLI: you can easily integrate it with your systems and let it act as a centralized password vault. Instead, for a ready to use, simple yet complete Web GUI to run along the API, have a look at companion app PassWeaver GUI: https://github.com/steunix/passweaver-gui

PassWeaver API is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:

- Express, to manage HTTPS connections
- EJS, for HTML templating
- Prisma, for ORM and DB access

See below for a full API documentation.

## Dependencies

- PostgreSQL: PassWeaver API uses PostgreSQL for storing data
- Redis: (optional) for caching

## Features

- Cloud KMS integration
- API keys
- Personal folders for each user
- Favorite items
- Share one-time secrets with anyone, even if they have not an account
- One-time share items
- Share items through permalinks
- Folder level permissions
- User groups
- Extensive log actions on items
- Both LDAP and local authentication
- Immediate system lock (only admins can login)

## How it works

PassWeaver API gives you access to the following objects:

  - Users: who can access the system
  - Groups: groups of users
  - Items: the entries you want to protect
  - Items type: a way to categorize your items
  - Folders: containers of items
  - Personal folders: special folder accessible only to a single user
  - Onetime secrets: an easy way to share a one-time only secrets

### Items

An 'item' is an entity with a (unecrypted) `title`, a `type` field, `metadata` field, and some encrypted `data`. PassWeaver API just encrypts "strings", so your data can be anything that can be converted into a string: there is not built-in logic on the content.

For example, in one item you may store a JSON object that identifies a login:
```
{
  url: "abc",
  user: "aaa",
  password: ""
}
```

and in another item you may have something that represents an API credentials set:
```
{
  clientid: "",
  clientsecret: "",
  url: "",
  scope: ""
}
```
and in another item you may have just only a flat string.

It's up to the consumer to decode and handle the data, maybe based on the `type` field (see Item types below).

An item has also a mandatory `title` field, that can be searched for and is NOT encrypted: do not use it for storing sensitive information.

The `metadata` field is NOT encrypted as well but not mandatory, and it allows to store any additional uncrypted info for a given item.

### Item types

Item types are categorized, and they just consist of a code and a description.

### Folders

Folders, just like in a file system, hold collections of items and/or subfolders. Each folder may hold specific persmissions for a given group, and will inherit parent's permissions (see 'Permissions' below).

PassWeaver API has 2 predefined folders that cannot be modified or deleted:
- Root folder
- Personal folders root

### Personal folders

Each user has a 'personal' folder for storing private, not-shared-with-anyone items. In order to use personal folders, users have to set a personal password that will be use for
encrypting items inside those folders. Since this password is used to encrypt the key that will be used to encrypt his items ("envelope encryption"), there is no way to recover
the items if a user forgets his password.

### Users and groups

Users are assigned to groups, and groups have read/write permissions for a given folder.

Users can join any number of groups.

While groups can be nested to form a tree, there is no membership inheritance: if a user is member of a group G, it will not automatically join the "children" of G.

#### Authentication

PassWeaver supports two authentication methods:
 - Local: the user password is stored locally
 - LDAP: a self authentication to an LDAP server: no LDAP admin credential are needed, a direct login is tried
 - API key: the user can authenticate only via an existing API key

#### Admins

The **Admins** built-in group and it's built-in member user **admin** are targeted at creating users and groups, and assigning permissions to folders. Both Admins group and admin user cannot be updated or deleted.

Since **Admins** group members are meant for administration tasks, they have **NO** access to any items in any folder, and they do not have personal folders either. They can though add and (if empty) remove folders.

If you need someone with full access to all folders, you may create a group with read/write permissions on Root folder and add the user.

#### Everyone

Another built-in group is **Everyone**, quite self-explanatory: all created users will be automatically added to this group, and they can't be removed from it.

### Permissions

Permissions are per folder, not per item: you cannot give different permissions to different items in the same folder.

A folder has 2 permissions:
- read: permission to list and read items
- write: permission to create/modify items or subfolders. It implies read permission.

Permissions are granted **to groups** of users, and not to single users: this is intentional, following the KISS philosophy; in complex environments, permissions for a single user or for a single item are difficult to maintain and very easy to mess with, while group permissions let you have a cleaner and more maintainable configuration.

Following same KISS paradigm, permissions are **always** inherited. For example, in a company setup you may have these folders:

- Root
  - Datacenters
    - Azure
    - AWS
    - GCP
  - Headquarter
    - VPNs
    - NAS systems

Suppose that datacenters are managed by different groups of people: you would have a "AzureAdmins" group, along with "AWSAdmins" and "GCPAdmins", and you would give read+write permissions to each group on its own folder.

You may have a user managing both GPC and AWS, so you would just have to add the user to both "AWSAdmins" and "GCPAdmins".

But, remember, **permissions are always inherited**. What does this mean?

If an "AdminGCP" user creates a new folder in "GCP", let's suppose "VPNs", what happens? This folder would inherit the "GCP" permissions, thus, in our example, read+write for "GCPAdmins". Even if this new "VPNs" folder is given read+write permissions on a completely different group, and not "AdminGCP" explicitly, "AdminGCP" will always have read+write permissions.

In other words, a permission on a folder is granted **for itself and all its children folders**.

While this may sound as a limitation, in the long run it allows to avoid wild permissions forests, such as "hidden" folders available only to a restricted number of people, in a point of the  'tree' where you would not expect it.

That is indeed **exactly** how user **Admin** in PassWeaver API works: it's part of the builtin **Admins**, which has read+write access to 'Root' folder, thus to every folder - due to this kind of inheritance.

### One time secrets

OTS are an easy way to share a secret with someone: you provide the data to encrypt and you will receive back a token; accessing the token through the API, you will have access to the the decrypted data, **but only once**: once "consumed", the token will be deleted.

This is similar to various public services you can find online.

## Authentication

Users can authenticate by local user password or LDAP/Active directory, depending of the user config; PassWeaver uses signed JWTs to keep track of user id between calls, there is no persistent session handling.

### API keys

API keys can be created for easier credential handling in case of automated clients. An API key is bound to a user, whose authentication method must be 'apikey': this way you can easily manage permissions as you would do for a regular
user (assigning it to a group), without the need of exposing proper user password or to disrupt functionalities in case the user changes his password.

You can create as many API keys you need for a given user and activate/disactivate them at any time. They also have an expiration date.

Signing in with an API key will result in a regular JWT.

## Encryption

PassWeaver API applies classic envelope encryption on items:
  - a DEK (data encryption key) is randomly generated for every new item
  - the DEK is used to encrypt item data (AES-256-GCM algorithm)
  - the DEK itself is encrypted using a KEK (Key encryption key) obtained by a (configurable) KMS
  - the same KEK (thus the same KMS) will be needed for decrypting the item

So the KMS is responsible to handle a KEK: any number of KMS can be created, but only one can be "active" at a given time: it will be used for any new encryption (both new items, updates on existing items, new onetime secrets); non active KMS will be used only for decrypting old items.

**Whatever KMS you decide to use, PassWeaver-API uses symmetric encryption, so please keep in mind that losing your KEK will irremediably make all your database unreadable.** So be sure to have all the tools to recover it, or preserve it very safely.

Also, consider that you should never change the configuration of a KMS, because that may render unreadable all the items that were encrypted with it. It's always better to create a new one with fresh config.

Each KMS as its own configuration in JSON format; below a list of supported KMS.

### Local file KMS

The "Local file" KMS works by reading the KEK (master key) from a local file. The configuration you have to provide when creating the KMS with the API is the following JSON:
```
{
  "master_key_path": "/path/to/master/key/file"
}
```

The local file must contain only one line, a base64-encoded 32 bytes key.

A default Local file KMS is shipped by default with Passweaver-API, with a `master_key_path` set to `/etc/passweaver/passweaver-master-key.txt`

Local file KMS is a quick-n-dirty way to start, but the KEK is stored on the local file system, thus available to a potential attacker who gets access to the machine.

### Google Cloud KMS

In order to use Google Clould KMS, you need to create a keyring and an active simmetric key with your Google Cloud account, and then you must to provide this configuration to PassweaverAPI:

```
{
  "projectId": "<google project id>",
  "locationId": "<region of the keyring>",
  "keyRingId": "<keyring id>",
  "keyId": "<key id>"
}
```

You must then set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of your service account key JSON: [follow this link for info](https://cloud.google.com/iam/docs/keys-create-delete?hl=it).

The key version used to crypt the DEK will be stored along the item, but **keep in mind that at the moment PassWeaverAPI does not handle the key rotation**: if a version of the key gets invalidated,
the items using that version will not be readable anymore: at the moment **you have to disable key rotation**. A feature to convert items from one version of the key to another will be added in the
near future.

### Personal items

Personal items are encrypted with a double envelope encryption:

- When a user set its personal password for the first time, a random key (PKEY) is automatically generated
- PKEY is encrypted with a key derived from the user password using PBKDF2, and stored in the database
- The personal password (PPWD) is stored in the db using bcrypt algo
- When user unlocks the personal folder providing his PPWD, the authentication JWT will be updated adding a claim with his seeded and encrypted password:
  - the PPWD is seeded with random bytes initialized on Password-API startup, and then encrypted with AES-256-ECB using random key and i.v. also initialized at startup
  - this updated JWT needs to be used for subsequent calls in order to identify a user that actually unlocked the personal folder
  - **NOTE**: adding the encrypted password in the JWT is needed because Passweaver API is stateless and sessionless, so the only way to recognize the user and - in this case -
    the fact that it has unlocked its personal folder - is the JWT itself
- When a user wants to access a personal folder, the seeded and encrypted PPWD in the JWT is validated against the one stored into the DB in order to grant access

Then, when creating an item in a personal folder:
- PPWD is extracted from JWT and decrypted
- PKEY is decrypted using the key derived from user password (PBKDF2)
- Data is encrypted with AES-256-ECB using PKEY
- Resulting data is then encrypted with your active KMS (thus, double envelope encryption)

When reading a personal item:
- PPWD is extracted from JWT and decrypted
- PKEY is decrypted using the key derived from user password (PBKDF2)
- Data is decrypted with the KMS used to crypt it
- Obtained data is then decrypted with AES-256-ECB using PKEY

**No keys or passwords are retained in memory or cache, everything is recalculated when needed.**

### Further security

As further security measure, item data and onetime secrets are not sent in plain text as a response to the API, instead they are encrypted with the mandatory key given in the request: this ensures
that the item data cannot be (easily) sniffed from the raw network traffic (provided that you generate a random key at every call): this is useful in case you keep the API (or the frontend) in
plain HTTP instead of using HTTPS (maybe because you are already behind a reverse proxy).

Of course one could decrypt the data if it intercepts both the request and the response... so **please enable HTTPS** even if behind a secured network.

## Operations log

Passweaver API keeps a log about:
- operations on items (creation, deletion, update, clone)
- accesses to items
- operations on folders (creation, deletion, update)
- operations on users (creation, deletion, update)
- operations on groups (creation, deletion, update)
- operations on one time secrets
- login and passwords changes
- personal folders unlocks

## Application logs

PassWeaver API logs every HTTP call in a 'combined log format' (the file is named passweaver-api-access.log) while errors are tracked in a separate log (passweaver-api-errors.log). There are configuration options to customize log files directories, rotation and retention.

## Cache

PassWeaver API makes use of a cache in order to avoid too much pressure on the database, especially in relation to permissions and folders tree for each user. You can choose between these cache providers:
  - internal: when the "redis" configuration (see below) is false, `node-cache` npm module is used: be aware that this module is
    **intentionally** non advisable for production environments
  - Redis: you can use Redis by setting "redis" to true in the configuration and providing an URL to a running Redis instance

## The API

### Authentication

PassWeaver API is **stateless** and **sessionless** and uses SHA-512 signed JWTs for authentication; JWT signing key is randomly generated every time the application is started.

A JWT is returned on successful login, and it must be provided in all subsequent calls - until it expires - in requests header as an "Authorization bearer".

Currently there is no support for token renewal.

### Responses

PassWeaver API endpoints respond with JSON payloads using standard HTTP response codes, so be sure to handle them correctly:

- 400: Bad request: your payload is not valid, malformed, or missing some field
- 401: Unauthorized: you haven't logged in yet, or your JWT is not valid/expired
- 403: Forbidden: you do not have permissions to do what you're asking for
- 404: Not found: what you are looking for does not exist
- 409: Conflict: a write operation is attemped, but system is in readonly mode
- 412: Personal secret not set: user hasn't set a password for personal folder yet
- 417: Personal secret not specified: user hasn't specified a personal password when accessing a personal item
- 422: Unprocessable entity: the entity you are accessing exists, but the data you provided is not acceptable
- 500: Internal error

Along with HTTP response code, you'll always get this minimum payload:
```
{
  status: "success/failed",
  message: "text",
  data: {}
}
```

In case of errors (status="failed"), you can find the explanation in the "message" field.

If any data is returned by the endpoint, it will be always encapsulated in the "data" field:
```
{
  status: "success/failed",
  message: "text",
  data: { whatever }
}
```

# Install and run

## Prerequisites

In order to be able to install PassWeaver API, you need:
  - NodeJS and npm
  - A running PostgreSQL instance

A running Redis instance is warmly advised.

## Install

Download the source, and install all dependencies with npm:

`npm install`

## Configure

Copy `config-skel.json` to `config.json` and adjust the options:

- **obsolete** `master_key_file`: The file (with complete path) containing the (base64 encoded) master key; it is only necessary if you have a database with items created with version 1.x API
- `jwt_duration`: JWT duration. For example, "2h" or "1d". When JWT expires, a new login is required.
- `listen`:
  - `port`: port to bind
  - `host`: IP address to bind (or blank for any address)
- `log`:
  - `dir`: Logs directory. It will be created if necessary.
  - `rotation`: Rotation interval. For example, "12h" or "1d"
  - `retention`: Log files retention (number of rotated log files kept)
- `ldap`: LDAP configuration
  - `url`: LDAP server URL, in the form "ldap://ipaddress" or "ldaps://ipaddress"
  - `port`: LDAP server port
  - `baseDn`: baseDn for credential check
  - `userDn`: userDn for credential check
  - `bindDn`: user for searching directory
  - `bindPassword`: password for searching directory
  - `tlsOptions`: will be passed to ldapts Node package. Note that `cert` and `ca` will accept a file path instead of file content.
    - `cert`: path to certificate
    - `ca`: path to CA certificate
- `https`:
  - `enabled`: HTTPS enabled (true/false)
  - `certificate`: certificate file path
  - `private_key`: certificate private key
  - `hsts`: enable HSTS (true/false)
- `redis`:
  - `enabled`: true or false; if false, internal cache is uses
  - `url`: Redis url
- `onetimetokens`:
  - `max_hours`: Max one-time secrets duration
- `readonly`: true or false; if true, no write operation is allowed both for admins and regolar users

### Environment

Passweaver API reads this environment variable:

- `PASSWEAVERAPI_PRISMA_URL`: the database connection string in the form `postgresql://user:password@serverip:port/database`

See [Prisma Documentation](https://www.prisma.io/docs/orm/overview/databases/postgresql#connection-details) for further details.

If you're installing a production environment, don't forget to set variable `NODE_ENV` to `production`, since some of Passweaver API dependencies
use that variable to optimize operations.

### Database

PassWeaver API uses PostgreSQL as RDBMS and Prisma ORM to access it.

Create an empty database on your existent PostgreSQL instance, and set the environment variable `PASSWEAVERAPI_PRISMA_URL` accordingly.

Then, from PassWeaver-API directory, run the following commands:

- `npx prisma db push`: creates the schema
- `npx prisma db seed`: add initial data
- `npx prisma generate`: force creation of Prisma objects

A default user `admin` will be created with password `0`: of course you should change it as soon as possible.

## Run

run `npm passweaver-api.mjs`.

You may want to create a Linux service via `systemd` or a Windows service via `nssm`.

# Full API documentation

For a full API documentation you can refer to [this page](apidoc/index.html)