Key value: Quick and simple search of simple debates - no trawling through thousands of words of copy

Professionals
[ ] Send personal welcome email (Say newsletters don't work yet - add booking link to request features)
[/] Member profile search 
[ ] Make member profile search EC exclusive
[/] Make search page wider (on desktop)
[/] Assistant to ask questions
[/] Save searches to dashboard
[/] AI assistant and query (prompt) builder
[/] Store searches in context
[/] Select prompt/style in assistant builder
[/] More detailed summaries for longer debates 
[/] Limit assistant usage by engagement
[/] Assistant filter editing
[/] Export saved searches to file
[-] Implement 'Keep this assistant updated with new debates' 
      [-] Check new debates and add to matching assistants
      [ ] Remove old debates at end of week (second option)
[ ] Delete assistants
[ ] Save query-assistant pairs to rerun

[/] Save hansard searches
[ ] Term frequency tracking in hansard search
[ ] Add divisions to assistant
[ ] Add full voting history of each MP
[ ] Add bill progress/schedule
[ ] Add Order Paper

[ ] Newsletter sending from backend
   1) Generate a 'this week' intro from summaries
[ ] More detailed 'upcoming' using bills api

Next
[ ] Align key points and topics with individual contributions
[ ] Enhanced search using precomputed context from embeddings

Engaged Citizen
Update PostCard to implement full summary view
1) Bookmark debates
2) pgvector search in debate transcript
3) MP voting record
4) Restructure Voter Stats for clarity
5) Commons/Lords/Both toggle for auth unsubscribed
6) Hover hints for first time users

#Optimizations
- 'Upgrade for unlimited' popover shows when deselecting AI Enhanced in search, even for paid users
- Identify speakerlist process - some lords debates have empty but key points have real names
- Use key points names for images
- Generate Nameid to avoid ugly /debate urls
- Add speaker metadata to mp profile view
- Reduce middleware build size for edge runtime
- Callback to previous url when user signs in
- Restrict state updates to feed only when filters change

### Political Monitoring:
## Search
[/] Summaries and key points in search results
[/] Metadata from match in search results
[ ] Full report generation with Vector search/assistant

[/] Unique page for each debate
[ ] MP position tracking

Add RSS feed links

MP Office data (stakeholder mapping)
"Register of interests of members' secretaries and research assistants"
+ spending

API to request ai content for a debate

Daily (live) whatsapp channel - every bill reading. Results of debate on X

Generate a daily/ weekly report tailored to demographics:

Collect relevant data with questions like:
Where did you grow up?
Go to uni?
State or private education?
Free school meals?


## Feature tiers
Free Features for Signed in Users
- Feed and unlimited votes
- My Mp and divisions filter
- View upcoming Parliamentary questions
- Basic MP Profile view
- Basic voting record view
- Basic constituency voting record view
- Basic search
- View debate comments

Engaged Citizen Features
- Advanced Feed filters
- Track Your MP's key points
- Track your constituency's votes
- View your voting analytics
- Advanced search

Professional Features
- View Key points, voting records, and office spending of any MP
- AI Hansard search/research assistant
- Track Bill progress
- Subscribe to Hansard searches via email, RSS, API
- Site integrations
- Analysis with coverage
- Access parliamentary documents
- View gender and age normalized across ONS data

Enterprise Features
- Add custom question cards to your website
- Analyze voting trends by constituency
- Generate reports for your team
- Share research