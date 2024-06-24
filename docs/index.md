# PassWeaver API

PassWeaver API is an enterprise-scale, collaborative secrets manager API. It allows to safely store and retreive sensitive data, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted, protected, monitored, shared.

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined for each folder for each user group.

## What is it?

PassWeaver API is a full API server, is no GUI or CLI: you can easily integrate it with your systems and let it act as a password centralized vault. Instead, for a ready to use, simple yet complete Web GUI to run against the API, have a look at https://github.com/steunix/passweaver-gui

PassWeaver API is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:
- Express, to manage HTTPS connections
- Prisma, for ORM and DB access

See below for a full API documentation.

## How it works

### Items
An 'item' is an entity with a (unecrypted) title, a `type` field, `metadata` field, and some encrypted `data`. PassWeaver API just encrypts "strings", so your data can be anything that can be converted into a string: there is not built-in logic on the content.

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

It's up to the consumer to decode and handle the data, based on the `type` field.

An item has also a mandatory `title` field, that can be searched for and is NOT encrypted: do not use it for storing sensitive information.

The `metadata` field is NOT encrypted as well but not mandatory, and it allows to store any additional uncrypted info for a given item.

### Folders

Folders, just like in a file system, holds a collection of items and/or subfolders. Each folder may hold specific persmissions for a given group, and will inherit parent's credentials (see 'Permissions' below).

PassWeaver API has 2 predefined folders that cannot be modified:
- Root folder
- Personal folders root

### Personal folders

Each user has a 'personal' folder for storing private, not-shared-with-anyone items. Each user will have to set a personal password that will be used for unlocking personal folders. The key for encryption is (at the moment) the same of non-personal items.

### Users and groups

Users are assigned to groups, and groups have read/write permissions for a given folder.

Users can join any number of groups.

While groups can be nested to form a tree, there is no membership inheritance: if a user is member of a group G, it will not automatically join the "children" of G.

#### Authentication

PassWeaver supports two authentication methods:
 - Local: the user password is stored locally
 - LDAP: a self authentication to an LDAP server: no LDAP admin credential are needed, a direct login is tried

#### Admins

The **Admins** built-in group and it's built-in member user **admin** are targeted at creating users and groups, and assigning permissions to folders. Both Admins group and admin user cannot be updated or deleted.

Since **Admins** group members and **admin** user are meant for administration tasks, they have **NO** access to any items in any folder, and they do not have personal folders either.

#### Everyone

Another built-in group is **Everyone**, quite self-explanatory: all created users will be automatically added to this group, and they can't be removed from it.

### Permissions

A folder has 2 permissions:
- read: permission to list and read items
- write: permission to create/modify items or subfolders. It implies read permission.

Permissions are on **folders**, and not on single items, and are granted **to groups** of users, and not to single users: this is intentional, following the KISS philosophy; in complex environments, permissions for a single user or for a single item are difficult to maintain and very easy to mess with, while group permissions let you have a cleaner and more maintainable configuration.

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

While this may sound as a limitation, in the long run it allows to avoid wild permissions forests, such as "hidden" folders available only to a restricted number of people, in a point of the folder 'tree' where you would not expect it.

That is indeed **exactly** how user **Admin** in PassWeaver API works: it's part of the builtin **Admins**, which has read+write access to 'Root' folder, thus to every folder - due to this kind of inheritance.

## Encryption

User passwords are hashed using bcrypt algorythm.

Items are encrypted at rest in the database using AES-GCM, using a master key that is read **from the environment variable `PASSWEAVERAPI_MASTER_KEY`**: there is no other way to get the master key and this is fully intentional, in order to leave the responsability of safely keeping your master key secret completely **up to you**.

**WARNING**: as with any other software using asymmetric encryption, if you loose your master key you're **completely screwed** and there is no way to recover encrypted data. So be sure you keep your master key safe and *properly backed up*.

## Operations log

Every operation is logged into the database, from logins to CRUD operations, to items accesses.

## Application logs

PassWeaver API logs every call in a 'combined', Apache-like format. Errors are tracked in a separate log instead.

## The API

### Authorization

PassWeaver API uses JWTs for authorization with a SHA-512 algorithm. No sensitive data is stored within the token, just the user id.

A JWT is returned on successful login, and it must be provided in all subsequent calls - until it expires - in requests header as an "Authorization bearer".

### Responses

PassWeaver API endpoints respond with JSON payloads using standard HTTP response codes, so be sure to handle them correctly:

- 400: Bad request: your payload is not valid, malformed, or missing some field
- 401: Unauthorized: you haven't logged in yet, or your JWT is not valid/expired
- 403: Forbidden: you do not have permissions to do what you're asking for
- 404: Not found: what you are looking for does not exist
- 412: Personal secret not set: user hasn't set a password for personal folder yet
- 417: Personal secret not specified: user hasn't specified a personal password when accessing a personal item
- 422: Unprocessable entity: the entity you are accessing exists, but the data you provided is not acceptable

Along with HTTP response code, you'll always get this minimum payload:
```
{
  status: success/failed,
  message: text,
  data: {}
}
```

In case of errors (status="failed"), you can find the explanation in the "message" field.

If any data is returned by the endpoint, it will be always encapsulated in the "data" field:
```
{
  status: success/failed,
  message: text,
  data: { whatever }
}
```

# Install and run

## Install

Download the source, and install all dependencies with npm:

`npm install`

## Configure

Edit `config-skel.json` and save it as `config.json`. These are the options:
- `master_key_env`: The environment variable containing the master key
- `jwt_duration`: JWT (session) duration. For example, "2h" or "1d"
- `listen_port`: IP port to bind
- `log_dir`: Logs directory. It will be created if necessary.
- `ldap`: LDAP configuration
  - `url`: LDAP server host.
  - `port`: LDAP server port
  - `baseDn`: baseDn for searches
  - `userDn`: userDn for searches

### Environment

Your environment must expose these 2 variables:

- `PASSWEAVERAPI_MASTER_KEY`: the AES-256-GCM key used for encryption
- `PASSWEAVERAPI_PRISMA_URL`: the database connection string in the form `postgresql://user:password@serverip:port/database`

### Database

PassWeaver API uses PostgreSQL as RDBMS and Prisma to access it.

Create an empty database on your existent PostgreSQL istance, and set the environment variable `PASSWEAVERAPI_PRISMA_URL` accordingly.

Then, inside PassWeaver-API directory, run the following commands:

- `npx prisma db push`
- `npx prisma db feed`
- `npx prisma generate`

The default user `admin` will be created with password `0`: change it as soon as you login.

## Run

run `npm passweaver-api.mjs`.

You may want to create a Linux service via `systemd` or a Windows service via `nssm`.

# Full API documentation

For a full API documentation you can refer to [this page](apidoc/index.html)