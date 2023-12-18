# Vaulted

Vaulted is a collaborative password manager API. It allows to store and retreive secrets, such as sites passwords, API credentials, network passwords... in other words any information that needs to be encrypted and protected

It's **collaborative**, meaning that users are organized in groups and protected items are organized in folders: different permissions can be defined per folder for each user group.

## What is it

Vaulted is "only" a full API, there is no GUI or CLI: you can easily integrate it with your systems and let it act as a Password Centralized Vault. If you want a GUI... it will be available soon.

Vaulted is a NodeJS application, released under MIT license, and it uses these (great) opensource libraries, among several others:
- Express, to manage HTTPS connections
- Prisma, for ORM and DB access

## How it works

### Items
An 'item' is a group of data that need to be procted. As of today, an item is made of this data:

- description: free description of the item
- url: the reference URL (for example, http://www.mysite.com)
- username: the user id
- password: the password

The item has also a "title" property that will not be encrypted.

### Folders
Folders, just like a file system, holds a collection of items and/or subfolders. Each folder may hold specific persmissions for a given group, but will inherit parent's credentials (see 'Permissions' below).

Each user has a 'personal' folder where he can store private, not shared with anyone, items. Not even 'admin' user can read these items.

Vaulted has 2 predefined folders that cannot be modified:
- Root folder
- Personal folders root

### Users and groups
Users are assigned to groups, and groups have permissions for a given folder.

There is only one built-in 'superuser', namely **admin**, who can create other users and user groups. And **admin** is part of **Admins** built-in group: admin cannot be removed from Admins, but other users can join it.

Finally, users can join several groups simultaneously.

### Permissions
A folder has 2 permissions:
- read: permission to list and read items
- write: permission to create/modify items or subfolders. it implies read permission.

Permissions are on **folders**, and not on single items, and are granted **to groups** of users, and not to single users: this is intentional, following the KISS philosophy; in complex environments, permissions for a single user or single items are difficult to maintain and very easy to forget, while group permissions let you have a cleaner and more maintainable configuration.

Following same KISS paradigm, permissions are **always** inherited. For example, in a company setup you may have these folders:

- Root
  - Datacenters
    - Azure
    - AWS
    - GCP
  - Headquarter
    - VPNs
    - NAS systems

Suppose that datacenters are managed by different groups of people: you would have a "AzureAdmins" group, along with "AWSAdmins" and "GCPAdmins", and you would give read+write permissions to each.

You may have a user managing both GPC and AWS, so you would just have to add the user to both "AWSAdmins" and "GCPAdmins".

But, remember, **permissions are always inherited**. What does this mean?

If an "AdminGCP" user creates a new folder in "GCP", let's suppose "VPNs", what happens? This folder would inherit the "GCP" permissions, thus, in our example, read+write for "GCPAdmins". Even if this new "VPNs" folder is given read+write permissions on a completely different group, "AdminGCP" will alwasy have read+write permissions.

In other words, a permission on a folder is granted **for itself and all its children folders**, with no exception.

Think of it as a regular hard disk folder: 'root' user has access to all directories, and while user 'dummy' may create subdirectory, root will always be able to access them even if they have '700' permissions.

While this may sound as a limitation, in the long run it allows to avoid wild permissions forests, with children folders suddenly becoming invisible due to permissions changes.

That is indeed **exactly** how user 'Admin' in Vaulted works: it's part of the builtin "Admins" group, and "Admins" have read+write access to 'Root' folder.

## Encryption

Items are encrypted and stored in the database using a master key that is read **from the environment variable VAULTED_MASTER_KEY**: there is no other way to get the master key and this is fully intentional, in order to leave the responsability of safely keeping your master key secret completely **to you**.

Items are encrypted with AES-GCM algorithm, along with IV and secure token, using the master key.

**WARNING**: as with any other software using asymmetric encryption, if you loose your master key you're **completely screwed** and there is no way to recover encrypted data. So be sure you keep your master key safe and *properly backed up*.

## Access logging

Every operation is logged into the database.

## The API

### Authorization

Vaulted uses JWTs for authorization. No sensitive date is stored within the token, just the user id.

A JWT is returned on successful login, and it must be provided in all subsequent calls - until it expires - in requests header as an "Authorization bearer".

### Responses

Vaulted endpoints respond with standard HTTP response codes, so be sure to handle them correctly:

- 400: Bad request: your payload is not valid, malformed, or missing some field
- 401: Unauthorized: you haven't logged in yet, or your JWT is not valid/expired
- 403: Forbidden: you do not have permissions to do what you're asking for
- 404: Not found: what you are looking for does not exist
- 422: Unprocessable entity: the entity you are accessing exists, but the data you provided is not acceptable

Along with HTTP response code, you'll always get this minimum payload:
{
  request: {
    id: text,
    timestamp: text
  },
  success: true/false,
  message: text
}

In case of errors (success=false), you can find the explanation in the "message" field. If any data is returned by the endpoint, it will be always encapsulated in a "data" field:
{
  success: true/false,
  message: text,
  data: { whatever }
}
