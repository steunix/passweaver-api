# PassWeaver API

## About

PassWeaver API is a collaborative, enterprise-scale secrets manager REST API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

PassWeaver API is a standard REST API server: you can easily integrate it with your systems and let it act as a centralized password vault. Instead, for a ready to use, simple yet complete Web GUI to run along the API, have a look at the companion app [PassWeaver GUI](https://github.com/steunix/passweaver-gui).

PassWeaver API is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:

- Express, to manage HTTPS connections
- Prisma, for ORM and DB access

See below for a full API documentation.

## Dependencies

This are the software you need to have in order to run PassWeaver API:

- PostgreSQL: PassWeaver API uses PostgreSQL for storing data, with tsvector extension enabled
- Redis: (optional) for caching

## Features

These are the features this API support, in random order:

- Cloud KMS integration (currently, only Google Cloud KMS)
- Login via Google OAuth2 token validation
- API keys, with IP whitelist and day of week/time whitelist
- Personal folders for each user
- Favorite items
- Linked items
- Share one-time secrets with anyone, even if they have not an account
- One-time share items
- Share items through permalinks
- Folder level permissions
- User groups
- Extensive log actions on items
- Both LDAP and local authentication
- Immediate system lock (only admins can login)
- Global readonly mode
- Export various metrics (including default NodeJS metrics) in Prometheus format

## API objects

PassWeaver API exposes the following objects:

  - Users: who can access the system
  - API Keys: useful in software integration
  - Groups: groups of users
  - Items: the entries you want to protect
  - Items type: a way to categorize your items
  - Folders: containers of items
  - Personal folders: special folder accessible only to a single user
  - Onetime secrets: an easy way to share a one-time only secrets
  - KMS: Key management services

### Items

An 'item' is an entity with a (unecrypted) `title`, a `type` field, `metadata` field, and some encrypted `data`. PassWeaver API just encrypts "strings", so your data can be anything that can be converted into a string: there is not built-in logic on the content.

For example, in one item you may store a JSON object that identifies a login:
```json
{
  url: "abc",
  user: "aaa",
  password: ""
}
```

and in another item you may have something that represents an API credentials set:
```json
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

### Linked items

You can "link" an item into many other folders: this avoids duplicating items that need to appear in many places, allowing to manage updates only on the original item. They work like Unix file system symlinks, with
the exception that linked items cannot be modified, only the original item can accept updates.

Linked items can be cloned and shared as any regular item.

### Item types

Item types are "labels" you can attach to items: and they consist of a code and a description that will help you to organize and search  your items.

### Folders

Folders, just like in a file system, hold collections of items and/or other folders. Each folder may hold specific persmissions for a given group, and will inherit parent's permissions (see 'Permissions' below).

PassWeaver API has 2 predefined folders that cannot be modified or deleted:
- Root folder
- Personal folders root

### Personal folders

Each user has a personal folder for storing private, non-shared-with-anyone items. In order to use personal folders, users have to set a personal password that will be used to
encrypt items inside those folders. Since this password is used to encrypt the key that will be used to encrypt his items ("envelope encryption"), there is no way to recover
the items if a user forgets his password.

### Users and groups

Users are assigned to any number of groups, and groups have read/write permissions for a given folder.

While groups can be nested to form a tree, there is no membership inheritance: if a user is member of a group G1, it will not automatically join the "children" of G1.

### One time secrets

OTS are an easy way to share a secret with someone: you provide the data to share and you will receive back a unique token: accessing the token through the API, you will have access to the the decrypted data, **but only once**: once "consumed", the token will be deleted. You can choose the audience of the OTS:
- anyone (logged in or not)
- anyone logged in (requires authentication for reading the token)
- a specific user (both creator and reader must be authenticated)

This is similar to various public services you can find online.

You can share both random text, or an entire item.

Note that both creation and consumption of OTS don't require any authentication.

### API keys

API keys can be created to easier credential handling in case of automated clients. An API key is bound to a user, whose authentication method must be 'apikey': this way you can easily manage permissions as you would do for a regular
user (assigning it to a group), without the need of exposing users password or to disrupt functionalities in case the user changes it.

For each API key you can optionally define two whitelists:
- source IP whitelist: you can specify a list of CIDR notation IPs or subnet allowed to use the API key; for example 192.16.0.0/24,192.168.1.34/32
- day of week and time whitelist: you can specify a list of days of week and start/end time when the API key is usable; for example ANY:1400-1500,TUE:1600-1615 means "Any day of the week from 14 to 15, and Tuesdays from 16:00 to 16:15"

You can create as many API keys you need for a given user and activate/disactivate them at any time. They also have an expiration date.

## Authentication

PassWeaver API users can be authenticated via these methods:

 - Local: the user password hash is stored locally in the database
 - LDAP: authenticate against a LDAP/Active Directory server
 - API key: authenticate only via an existing API key
 - Google OAuth2 token validation: see below

### Google OAuth2 token validation

You can integrate your frontend with Google OAuth2 (PassWeaver GUI supports is), and once you obtain a valid token PassWeaver API can validate it and obtain the informations to log you in:
it will look for an existing user with the email obtained from the token.

In order to enable Google OAuth2, you have to set auth.google_oauth2 in the configuration, and export GOOGLE_CLIENT_ID of your Google API Key in your environment.

## Authorization

### Users groups

Authorization on folders is managed at users group level. `Admins` and `Everyone` are predefined groups, they cannot be deleted.

#### Admins

The **Admins** built-in group and it's built-in member user **admin** are targeted at creating users and groups, assigning permissions to folders, managing API keys and KMS. Both Admins group and admin user cannot be updated or deleted.

Since **Admins** group members are meant for administration tasks, they have **NO** access to any item, and they do not have personal folders either. They can though add and remove folders.

If you need someone with full access to all folders, you may want to create a group with read/write permissions on Root folder and add the user, since persimssions are inherited (see "Permissions" below)

#### Everyone

Another built-in group is **Everyone**, quite self-explanatory: all created users will be automatically added to this group, and they can't be removed from it.

### Permissions

Permissions are per folder, not per item: you cannot give different permissions to different items in the same folder.

A folder has 2 permissions:
- read: permission to list and read items
- write: permission to create/modify items or subfolders. It implies read permission.

Permissions are granted **to groups** of users, and not to single users: this is intentional, following the KISS philosophy; in complex environments, very fine-grained permissions for a single user or for a single item are difficult to maintain and very prone to errors, while group permissions let you have a cleaner and more maintainable configuration.

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

But, remember, **permissions are always inherited**.

If an "AdminGCP" user creates a new folder in "GCP", let's suppose "VPNs", what happens? This folder would inherit the "GCP" permissions, thus, in our example, read+write for "GCPAdmins". Even if this new "VPNs" folder is given read+write permissions on a completely different group, and not "AdminGCP" explicitly, "AdminGCP" will always have read+write permissions.

In other words, a permission on a folder is granted **for itself and all its children folders**.

While this may sound as a limitation, in the long run it allows to avoid wild permissions forests, such as "hidden" folders available only to a restricted number of people, in a point of the 'tree' where you would not expect it.

That is indeed **exactly** how user **Admin** in PassWeaver API works: it's part of the builtin **Admins**, which has read+write access to 'Root' folder, thus to every folder - due to this kind of inheritance.

## Items encryption

PassWeaver API applies classic envelope encryption on items:
  - a DEK (data encryption key) is randomly generated for every new item
  - the DEK is used to encrypt item data (AES-256-GCM algorithm)
  - the DEK itself is encrypted using a KEK (Key encryption key) obtained by a (configurable) KMS
  - the same KEK (thus the same KMS) will be needed for decrypting the item

The KMS object is responsible to handle a KEK: any number of KMS can be created, but only one can be "active" at any time: it will be used for any new encryption (both new and updated items, new onetime secrets); the KMS id is stored along the item, so non active KMS will be used only for decrypting old items.

**Whatever KMS you decide to use, PassWeaver-API uses symmetric encryption, so keep in mind that losing your KEK will irremediably make all your database unreadable.** So be sure to have all the tools to recover it, or preserve it very safely.

If a KMS has been used to encrypt any item, it cannot be deleted.

Each KMS as its own configuration in JSON format.

Keep in mind that you should **never change the configuration of a KMS**, because that may render unreadable all the items that were encrypted with previous configuration. It's always better to create a new KMS with modified parameters.

Here is a list of currently supported KMS.

### Local file KMS

The "Local file" KMS works by reading the KEK (master key) from a local file. The configuration you have to provide when creating the KMS with the API is the following JSON:

```
{
  "master_key_path": "/path/to/master/key/file"
}
```

The local file must contain only one line, a base64-encoded 32 bytes key.

A default Local file KMS is shipped by default with Passweaver-API, with a `master_key_path` set to `/etc/passweaver/passweaver-master-key.txt`.

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

### Personal items encryption

Personal items are encrypted with a double encryption:

- When a user set its personal password for the first time:
  - a random key (PDEK) is automatically generated; this will be used to encrypt the data
  - another key (PKEK) is derived from the user password using PBKDF2 and a random seed (RSEED); this key is NOT stored into the database (only the RSEED is)
  - the PDEK is then encrypted (envelope encryption) with PKEK, and stored into the database
  - The personal password (PPWD) is hashed (HPPWD) using bcrypt algo, and this hash is stored in the db
- When user unlocks the personal folder providing his PPWD, the authentication JWT will be updated adding a claim with his 'personal data' (RSEED and PPWD)
  - the RSEED and PPWD are encrypted with AES-256-CBC using a random key and a random i.v. initialized at application startup, forming the personal token (PTOKEN)
  - the PTOKEN is added to the JWT
  - this updated JWT needs to be used for subsequent calls in order to identify a user who actually unlocked the personal folder
  - **NOTE**: adding the (encrypted) password and seed in the JWT is needed because Passweaver API is stateless and sessionless, and the only way to reconstruct the PKEK is
    having the data forming it in the JWT itself
- When a user wants to access a personal folder, the password hash is validated against the stored hash (HPPWD) in order to grant access

Then, when creating an item in a personal folder:
- PPWD and PSEED are extracted from the JWT (PTOKEN) and decrypted with the random key generated at application startup
- PKEK is re-created on the fly using PPWD and PSEED
- PDEK is decrypted using the PKEK
- Data is encrypted with AES-256-ECB using PDEK
- Resulting data is then encrypted with your active KMS (thus, double encryption)

When reading a personal item:
- PPWD and PSEED are extracted from the JWT (PTOKEN) and decrypted with the random key generated at application startup
- PKEK is re-created on the fly using PPWD and PSEED
- PDEK is decrypted using the PKEK
- Data is decrypted with the KMS used to crypt it
- Obtained data is then decrypted with AES-256-ECB using PDEK

**No key or password is (intentionally) retained in memory or cache.**

**All the sensitive data is managed with Buffers instead of plain strings, and those Buffers are zeroed immediately after use**

### Further security

As further security measure, item data and onetime secrets are not sent in plain text as a response to the API, instead they are encrypted with the mandatory key given in the request: this ensures
that the item data cannot be (easily) sniffed from the raw network traffic (provided that you generate a random key at every call): this is useful in case you keep the API (or the frontend) in
plain HTTP instead of using HTTPS (something YOU DON'T REALLY WANT!).

Of course one could decrypt the data if it intercepts both the request and the response... so **please enable HTTPS** even if behind a secured network.

## Logging

Passweaver API keeps a log about:
- operations on items (creation, deletion, update, clone)
- accesses to items
- operations on folders (creation, deletion, update)
- operations on users (creation, deletion, update)
- operations on groups (creation, deletion, update)
- operations on one time secrets
- login (both user and API keys) and passwords changes
- personal folders unlocks

### Application logs

PassWeaver API logs every HTTP call in a 'combined log format' (the file is named passweaver-api-access.log) while errors are tracked in a separate log (passweaver-api-errors.log). There are configuration options to customize log files directories, rotation and retention.

## Metrics

If enabled in configuration, PassWeaver API export various metrics (along with default NodeJS environment ones) at the `/api/v1/metrics' endpoint:
  - Users logins count (`login_users_total`)
  - API keys logins count (`login_apikeys_total`)
  - API keys logins per single key (`login_apikeys_per_key_total`)
  - Item create, update, delete and read count (`items_created_total`, `items_updated_total`, `items_deleted_total`, `items_read_total`)
  - One time tokens count (`onetimetokens_created_total`, `onetimetokens_read_total`)
  - KMS encryptions and decryptions count (`kms_encryptions_total`, `kms_decryptions_total`)
  - KMS encryptions and descriptions for each KMS (`kms_encryptions_per_kms_total`, `kms_decryptions_per_kms_total`)
  - Cache hits and misses (`cache_hits_total`, `cache_misses_total`)

## Cache

PassWeaver API makes use of a cache in order to avoid too much pressure on the database, especially in relation to permissions and visible folders trees for each user. You can choose between these cache providers:
  - internal: when the "redis" configuration (see below) is false, `node-cache` npm module is used: be aware that this module is
    **intentionally** non advisable for production environments
  - Redis: you can use Redis by setting "redis" to true in the configuration and providing an URL to a running Redis instance

# The REST API

For a full API endpoints documentation you can refer to [this page](apidoc/index.html)

## Authentication

PassWeaver API is **stateless** and **sessionless** and uses SHA-512 signed JWTs for authentication; JWT signing key is randomly generated every time the application is started.

A JWT is returned on successful login, and it must be provided in all subsequent calls - until it expires - in requests header as an "Authorization bearer".

Currently there is no support for token renewal.

## Responses

PassWeaver API endpoints respond with JSON payloads using standard HTTP response codes, so be sure to handle them correctly:

- `400`: Bad request: your payload is not valid, malformed, or missing some field
- `401`: Unauthorized: you haven't logged in yet, or your JWT is not valid/expired
- `403`: Forbidden: you do not have permissions to do what you're asking for
- `404`: Not found: what you are looking for does not exist
- `409`: Conflict: a write operation is attemped, but system is in readonly mode
- `412`: Personal secret not set: user hasn't set a password for personal folder yet
- `417`: Personal secret not specified: user hasn't specified a personal password when accessing a personal item
- `422`: Unprocessable entity: the entity you are accessing exists, but the data you provided is not acceptable
- `500`: Internal error

Along with HTTP response code, you'll always get this minimum payload:
```json
{
  "status": "success/failed",
  "message": "text",
  "data": {}
}
```

In case of errors (status="failed"), you can find the explanation in the "message" field.

If any data is returned by the endpoint, it will be always encapsulated in the "data" field.

# Install and run

## 1. Pre-requisites

In order to be able to install PassWeaver API:
1. you need to install NodeJS and npm
2. you need to have connectivity to a running PostgreSQL instance with tsvector extension enabled
3. you'd better have connectivity to a running Redis instance

## 2. Install

Download the source at [this link](https://github.com/steunix/passweaver-api/releases/latest), and install all dependencies with npm:

`npm install`

## 3. Setup environment variables

Passweaver API uses this environment variable:

- `PASSWEAVERAPI_PRISMA_URL`: the database connection string in the form `postgresql://user:password@serverip:port/database`

See [Prisma Documentation](https://www.prisma.io/docs/orm/overview/databases/postgresql#connection-details) for further details.

If you're installing a production environment, don't forget to set variable `NODE_ENV` to `production`, since some of Passweaver API dependencies use that variable to optimize operations.

## 4. Configure

Copy `config-skel.json` to `config.json` and adjust the options (all options are mandatory, unless a default is specified):

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
  - `max_hours`: Max one-time secrets duration, expressed in hours
- `crypto`
  - `personal_key_pbkdf2_iterations`: The number of iterations for PBKDF2 functions (100000 is a good value); note that this value is used in personal keys encryption,
     so you should NOT change it on a production system, otherwise all personal items will be unreadable
- `readonly`: true or false; if true, no write operation is allowed both for admins and non-admins (logging is still operational)
- `enable_metrics`: true or false, enables Prometheus-formatted metrics
- `generated_password_length`: default length of random generated password (default is 15)
- `cache-control`: Cache-Control header to be sent along GET/HEAD responses
- `auth`:
  - `google_oauth2`:
    - `enabled`: if true, the login endpoint will accept the token for authenticating with Google OAuth2 token. Note that you have to set "GOOGLE_CLIENT_ID" in your environment
      to your API Key Client ID.
- `prisma_options`: these settings will be passed to Prisma PGClient creation. See [Prisma documentation](https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismaclient) for possible values.

## 5. Prepare the database

PassWeaver API uses PostgreSQL as RDBMS and Prisma ORM to access it.

Create an empty database on your existent PostgreSQL instance, and set the environment variable `PASSWEAVERAPI_PRISMA_URL` (see above) accordingly.

Then, in PassWeaver-API install directory, run the following commands:

- `npx prisma db push`: creates the database objects
- `npx prisma db seed`: add initial default data
- `npx prisma generate`: generates Prisma code

## 6. Run PassWeaver API

Run `node passweaver-api.mjs`.

If no error is reported, the API is up and running.

## 7. First login

A default user `admin` has been created, with password `0`: of course you should change it as soon as possible.

## 8. Need a GUI to handle your passwords?

If you need a GUI, have a look at [PassWeaver GUI](https://steunix.github.io/passweaver-gui/), a WEB based frontend for PassWeaver API.