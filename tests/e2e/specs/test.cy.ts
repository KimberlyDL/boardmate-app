describe('Home', () => {
  it('loads the home page', () => {
    cy.visit('/')
    cy.contains('ion-content', 'BoardMate')
  })
})
