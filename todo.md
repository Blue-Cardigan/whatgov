1) Implement email subscription option
2) Point whatgov.co.uk to new site
3) Fix stripe webhook
4) Write welcome email
5) Implement newsletter sending from backend

#Optimizations
Reduce middleware build size for edge runtime
Replace twfy image urls with hansard: https://members-api.parliament.uk/api/Members/5071/Portrait
Auth context when loading feed, to show all filters when page is loading


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