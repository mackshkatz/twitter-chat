class PagesController < ApplicationController
	def index
	end

	def show
		render :template => current_page
	end

protected
	
	def current_page
		"pages/#{clean_path}"
	end

	def clean_path
		path = Pathname.new "/#{params[:id]}"
		path.cleanpath.to_s[1..-1]
	end
end