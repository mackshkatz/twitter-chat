require 'spec_helper'

feature "A user can submit a tweet url", do
	before do
		visit root_path
	end

	context "with an invalid url", :js => true do	
		scenario "should respond with an error message" do
			fill_in "search-query", :with => "https://twitter.com/#!/BeccaGallery/status/1zzzz99156708512243713"
			click_button "search-button"
			page.should have_content "An error has occurred"
		end
	end

	context "with a valid url", :js => true do
		scenario "should respond with the conversation" do

		end
	end
end

feature "Home page" do
	background do
		visit root_path
	end
	
	context "header of page" do
		scenario "should have title" do
			page.should have_content "Twitter Chat"
		end
	end

	context "url" do
		scenario "should be the root" do
			current_path.should == root_path
		end
	end
end