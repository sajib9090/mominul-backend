Basic instruction for front end developer

user section
Post request
/api/v2/users/create-user
Create user => required field name, email and password
optional field ---- avatar

when user try to register it will send a verification email in user verified email.
then user should open their email and check if email found then click for verification

after verified user need login

Post request
/api/v2/users/auth-user-login
User login => required field -- email and password
after login we will send user an accesstoken in those accesstoken inside store less data like user_id and role

Get request
/api/v2/users/find-current-user
Current user get route => it will help to get current user information except password

Get request
/api/v2/users/auth-manage-token
Generate new accesstoken => permission to access refresh token and check refresh token valid or not if valid generate a new accesstoken

post section

post request
/api/v2/posts/create-post
Add post => required field -- must be loggedIn -- required field is post_description optional field postImage

get request
/api/v2/posts/get-all
get request => no need to login any one can see all posts
getting post there some method like search and also pagination available front end developer can set limit value that each request how many data want to get

get request
/api/v2/posts/get-single/:postId
get single post => if any one get single post it will increase views value

delete request
/api/v2/posts/delete/:postId
delete post => required - params - post_id and must be logged in

patch request for post description change
/api/v2/posts/edit/:postId
edit request => required - post_description and must be logged in

patch request for add like or comment or both
/posts/edit/add-like-comment/:postId
add like comment => if user want to add like in chosen post just front end developer need to send like true, this is dynamic if user again send like true it will dislike or like false

if user want to add comment just need to send comment after that all will manage in backend
