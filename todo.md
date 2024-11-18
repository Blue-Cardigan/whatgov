Fix Post height to first card. 

Create whatgov email and update sendgrid
Billing management (e.g upgrade, cancel)
account update (change email, delete)

My Parliament
- Integrate schedule
- Track Bill progress

Feed
- No infinite scroll for unauth; show 'sign up for an endless feed!' at bottom
- Add filters
- More schedule-like UX
- deprioritize Lords, prioritize bill discussion

Align questions/key points with ideology so users can tag themselves over time

#Optimizations
Load more virtualized debates at once/ slow down scroll/ skeletons 
- problem: looks janky when scrolling fast
Reduce middleware build size for edge runtime
Preload myparliament content (shows sign in briefly before loading)

- Signup/in 
- - Edge case handling
- - make routes guessable (/login instead of /accounts/signin)


Free Features for Signed in Users
- Feed and unlimited votes
- Basic Feed filters
- Basic voting record view
- Basic search
- Parliamentary schedule
- View debate key points
- *View general trends after info provided
- - ONS data?

Premium Features
- View Your MP's activity
- View your voting analytics
- Read rewritten debates

Professional Features
- AI Research Assistant
- Analysis with coverage
- Advanced Hansard search
- Subscribe to Hansard searches
- Access parliamentary documents

Enterprise Features
- View constituency voting trends
- Generate reports for your team
- Share research